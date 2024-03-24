import {
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecsPatterns,
    aws_iam as iam,
    aws_efs as efs,
    aws_s3 as s3,
    CfnOutput, IgnoreMode,
    RemovalPolicy,
    Stack,
    StackProps
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {LogGroup} from "aws-cdk-lib/aws-logs";
import {DockerImageAsset} from "aws-cdk-lib/aws-ecr-assets";
import {Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {AccessPoint} from "aws-cdk-lib/aws-efs";

interface ECSStackProps extends StackProps {
    cluster: ecs.Cluster,
    bucket: s3.Bucket;
    vpc: ec2.IVpc;
    projectName: string;
    environmentName: string;
    certificateArn: string;
}

export class AppStack extends Stack {
    constructor(scope: Construct, id: string, props: ECSStackProps) {
        super(scope, id, props);

        const projectName = props.projectName;

        const fileSystem = new efs.FileSystem(this, 'EfsFileSystem', {
            vpc: props.vpc,
            performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
            throughputMode: efs.ThroughputMode.BURSTING,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const accessPoint = new AccessPoint(this, 'AccessPoint', {
            fileSystem: fileSystem,
            path: "/data",
            createAcl: {
                ownerGid: "1001",
                ownerUid: "1001",
                permissions: "755"
            },
            posixUser: {
                uid: "1001",
                gid: "1001"
            }
        });

        const taskRole = new iam.Role(this, `${projectName}-task-role`, {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            description: "Role that the task definitions when running the code",
        });

        taskRole.attachInlinePolicy(
            new iam.Policy(this, `${projectName}-task-policy`, {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ["S3:*"],
                        resources: [props.bucket.bucketArn, props.bucket.bucketArn + "/*"],
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            'elasticfilesystem:ClientMount',
                            'elasticfilesystem:ClientWrite',
                            'elasticfilesystem:DescribeFileSystems',
                            'elasticfilesystem:DescribeMountTargets',
                        ],
                        resources: [fileSystem.fileSystemArn],
                    })
                ],
            })
        );

        const webTask = new ecs.FargateTaskDefinition(this, `${projectName}-web`, {
            family: `${projectName}-web`,
            memoryLimitMiB: 512,
            cpu: 256,
            taskRole: taskRole,
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                cpuArchitecture: ecs.CpuArchitecture.ARM64,
            },
            volumes: [
                {
                    name: "efs-volume",
                    efsVolumeConfiguration: {
                        fileSystemId: fileSystem.fileSystemId,
                        transitEncryption: 'ENABLED',
                        authorizationConfig: {
                            iam: 'ENABLED',
                            accessPointId: accessPoint.accessPointId,
                        }
                    }
                }
            ]
        });

        webTask.addToExecutionRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["S3:GetObject"],
            resources: [props.bucket.bucketArn + "/production.env"],
        }));

        webTask.addToExecutionRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["S3:GetBucketLocation"],
            resources: [props.bucket.bucketArn],
        }));


        const webLogGroup = new LogGroup(this, `/ecs/${projectName}/web`, {
            retention: 60,
            logGroupName: `/ecs/${projectName}/web`
        });
        if (props.environmentName === 'sandbox') {
            webLogGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);
        }


        const dockerImageAsset = new DockerImageAsset(this, 'OpinodoSurveysDockerImage', {
            directory: '../', // Specify the context directory
            file: './apps/web/Dockerfile',
            ignoreMode: IgnoreMode.DOCKER,
            buildArgs: {
                // "ENCRYPTION_KEY": "8eadb525897fe0d962b9f2e8063069a31acaa441a3badf35344e04736f8de77a",
                // "NEXTAUTH_SECRET": "e68372f606edd33c92c04091c753fd3332c5210d5572d903b5310c777821e207",
                // "DATABASE_URL": "postgresql://postgres:TUTaiGB%5EfjXf2M19wgLEk2_V%3Df3UgA@opinodo-surveys-db.cfx5x0nxveqd.eu-central-1.rds.amazonaws.com/OpinodoSurveysDB"
            },

        });

        const webContainer = webTask.addContainer('web', {
            image: ecs.EcrImage.fromDockerImageAsset(dockerImageAsset),
            essential: true,
            containerName: 'web',
            environmentFiles: [
                ecs.EnvironmentFile.fromBucket(props.bucket, 'production.env'),
            ],
            logging: ecs.LogDriver.awsLogs({streamPrefix: `ecs`, logGroup: webLogGroup}),
            portMappings: [{containerPort: 3000}],
        });

        webContainer.addMountPoints({
            sourceVolume: 'efs-volume',
            containerPath: '/home/nextjs/apps/web/uploads',
            readOnly: false
        });

        const webService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, `${projectName}-web-service`, {
            cluster: props.cluster,
            desiredCount: 2,
            taskDefinition: webTask,
            serviceName: 'web',
            assignPublicIp: true,
            loadBalancerName: `${projectName}-LB`,
            taskSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            // redirectHTTP: true,
            certificate: Certificate.fromCertificateArn(this, `${projectName}-certificate`, props.certificateArn)
        });

        webService.targetGroup.configureHealthCheck({
            path: "/auth/login",
            healthyThresholdCount: 3,
            healthyHttpCodes: '200'
        });

        // Allow access to EFS from Fargate ECS
        fileSystem.connections.allowDefaultPortFrom(webService.service.connections);

        const scalableTarget = webService.service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 5,
        })

        scalableTarget.scaleOnMemoryUtilization(`${projectName}-ScaleUpMem`, {
            targetUtilizationPercent: 60,
        });

        scalableTarget.scaleOnCpuUtilization(`${projectName}-ScaleUpCPU`, {
            targetUtilizationPercent: 60,
        });

        // Publish the web service ARN as an output
        new CfnOutput(this, 'EcsWebServiceArn', {
            value: webService.service.serviceArn,
            exportName: 'EcsWebServiceArn'
        });
    }
}

import {
    aws_ec2 as ec2,
    aws_ecr as ecr,
    aws_ecs as ecs,
    aws_ecs_patterns as ecsPatterns,
    aws_iam as iam,
    aws_s3 as s3,
    CfnOutput, IgnoreMode,
    RemovalPolicy,
    Stack,
    StackProps
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {LogGroup} from "aws-cdk-lib/aws-logs";
import {DockerImageAsset} from "aws-cdk-lib/aws-ecr-assets";

interface ECSStackProps extends StackProps {
    projectName: string;
    environment: string;
    env: { [key: string]: string } | undefined;
}

export class ApplicationStack extends Stack {
    constructor(scope: Construct, id: string, props: ECSStackProps) {
        super(scope, id, props);

        const projectName = props.projectName;

        const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {isDefault: true});

        const repository = new ecr.Repository(this, `${projectName}-repository`, {
            repositoryName: `${projectName}`,
            lifecycleRules: [{ maxImageCount: 50 }],
        });
        if (props.environment === 'sandbox') {
            repository.applyRemovalPolicy(RemovalPolicy.DESTROY);
        }

        const cluster = new ecs.Cluster(this, `${projectName}-cluster`, {
            clusterName: `${projectName}-cluster`,
            vpc,
        });

        const backendBucket = new s3.Bucket(this, `${projectName}-s3-bucket`, {
            bucketName: `${projectName}-assets`,
        });

        if (props.environment === 'sandbox') {
            backendBucket.applyRemovalPolicy(RemovalPolicy.DESTROY);
        }
        const taskRole = new iam.Role(this, `${projectName}-task-role`, {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            roleName: `${projectName}-task-role`,
            description: "Role that the task definitions use to run the code",
        });
        taskRole.attachInlinePolicy(
            new iam.Policy(this, `${projectName}-task-policy`, {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ["S3:*"],
                        resources: [backendBucket.bucketArn, backendBucket.bucketArn + "/*"],
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ["SES:*"],
                        resources: ["*"],
                    }),
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
        });

        webTask.addToExecutionRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["S3:GetObject"],
            resources: [backendBucket.bucketArn + "/production.env"],
        }));
        webTask.addToExecutionRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["S3:GetBucketLocation"],
            resources: [backendBucket.bucketArn],
        }));


        const webLogGroup = new LogGroup(this, `/ecs/${projectName}/web`, {
            retention: 60,
            logGroupName: `/ecs/${projectName}/web`
        });
        if (props.environment === 'sandbox') {
            webLogGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);
        }


        const dockerImageAsset = new DockerImageAsset(this, 'OpinodoSurveysDockerImage', {
            directory: '../', // Specify the context directory
            file: './apps/web/Dockerfile',
            ignoreMode: IgnoreMode.DOCKER,
            buildArgs: {
                "ENCRYPTION_KEY":"8eadb525897fe0d962b9f2e8063069a31acaa441a3badf35344e04736f8de77a",
                "NEXTAUTH_SECRET":"e68372f606edd33c92c04091c753fd3332c5210d5572d903b5310c777821e207",
                "DATABASE_URL":"postgresql://postgres:TUTaiGB%5EfjXf2M19wgLEk2_V%3Df3UgA@opinodo-surveys-db.cfx5x0nxveqd.eu-central-1.rds.amazonaws.com/OpinodoSurveysDB"
            },
        });

        const webContainer = webTask.addContainer('web', {
            // image: ecs.ContainerImage.fromEcrRepository(repository),
            image: ecs.ContainerImage.fromDockerImageAsset(dockerImageAsset),
            essential: true,
            containerName: 'web',
            environment: props.env,
            environmentFiles: [
                ecs.EnvironmentFile.fromBucket(backendBucket, 'production.env'),
            ],
            logging: ecs.LogDriver.awsLogs({streamPrefix: `ecs`, logGroup: webLogGroup}),
        });
        webContainer.addPortMappings({containerPort: 3000});

        const webService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, `${projectName}-web-service`, {
            cluster,
            desiredCount: 1,
            taskDefinition: webTask,
            serviceName: 'web',
            assignPublicIp: true,
            loadBalancerName: `${projectName}-LB`,
            taskSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
        });

        webService.targetGroup.configureHealthCheck({
            path: "/auth/login",
            healthyThresholdCount: 3,
            healthyHttpCodes: '200'
        });

        const scalableTarget = webService.service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 5,
        })

        // Publish the web service ARN as an output
        new CfnOutput(this, 'EcsWebServiceArn', {
            value: webService.service.serviceArn,
            exportName: 'EcsWebServiceArn'
        });

        scalableTarget.scaleOnMemoryUtilization(`${projectName}-ScaleUpMem`, {
            targetUtilizationPercent: 60,
        });

        scalableTarget.scaleOnCpuUtilization(`${projectName}-ScaleUpCPU`, {
            targetUtilizationPercent: 60,
        });
    }
}

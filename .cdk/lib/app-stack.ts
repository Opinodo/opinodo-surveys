import {
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecsPatterns,
    aws_iam as iam,
    aws_logs as aws_logs,
    aws_lambda as aws_lambda,
    aws_logs_destinations,
    aws_elasticache as elasticcache,
    aws_s3 as s3,
    aws_efs as efs,
    CfnOutput,
    CustomResource,
    Duration,
    RemovalPolicy,
    Stack,
    CfnResource,
    IgnoreMode,
    StackProps
} from "aws-cdk-lib";
import {Construct} from 'constructs';
import {DockerImageAsset} from "aws-cdk-lib/aws-ecr-assets";
import {Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {LogGroup, SubscriptionFilter} from "aws-cdk-lib/aws-logs";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

interface ECSStackProps extends StackProps {
    cluster: ecs.Cluster,
    bucket: s3.Bucket;
    vpc: ec2.IVpc;
    taskCPU: number;
    taskMemory: number;
    projectName: string;
    environmentName: string;
    certificateArn: string;
    envFileName: string;
    cacheNodeType: string;
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

        const accessPoint = new efs.AccessPoint(this, 'AccessPoint', {
            fileSystem: fileSystem,
            path: "/data",
            posixUser: {
                uid: "1001",
                gid: "1001"
            },
            createAcl: {
                ownerGid: "1001",
                ownerUid: "1001",
                permissions: "755"
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

        // Create a separate task definition for migrations
        const migrationTask = new ecs.FargateTaskDefinition(this, `${projectName}-migrations`, {
            family: `${projectName}-migrations`,
            memoryLimitMiB: 2048, // Smaller than the web task since it's just for migrations
            cpu: 1024,
            taskRole: taskRole,
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                cpuArchitecture: ecs.CpuArchitecture.ARM64,
            }
        });

        migrationTask.addToExecutionRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["S3:GetObject"],
            resources: [props.bucket.bucketArn + "/" + props.envFileName],
        }));

        migrationTask.addToExecutionRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["S3:GetBucketLocation"],
            resources: [props.bucket.bucketArn],
        }));

        migrationTask.addToExecutionRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams'
            ],
            resources: ['*']
        }));

        // Create a custom resource to ensure the log group exists
        const migrationLogGroupName = `/ecs/${projectName}/migrations`;
        
        // Create a Lambda function to handle the custom resource
        const ensureLogGroupLambda = new NodejsFunction(this, 'EnsureLogGroupLambda', {
            runtime: aws_lambda.Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: path.join(__dirname, '../lambda/ensure-log-group.ts'),
            timeout: Duration.minutes(1),
            initialPolicy: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'logs:CreateLogGroup',
                        'logs:PutRetentionPolicy',
                        'logs:DescribeLogGroups'
                    ],
                    resources: ['*']
                })
            ]
        });
        
        // Create a custom resource that will ensure the log group exists
        const ensureLogGroup = new CustomResource(this, 'EnsureLogGroupExists', {
            serviceToken: ensureLogGroupLambda.functionArn,
            properties: {
                LogGroupName: migrationLogGroupName,
                RetentionInDays: 60
            }
        });
        
        // Import the log group (whether it existed before or was just created)
        const migrationLogGroup = LogGroup.fromLogGroupName(
            this, 
            `${projectName}MigrationLogGroup`, 
            migrationLogGroupName
        );
        
        // Add explicit dependency to ensure log group is created before the task
        migrationTask.node.addDependency(ensureLogGroup);

        const dockerImageAsset = new DockerImageAsset(this, 'OpinodoSurveysDockerImage', {
            directory: '../', // Specify the context directory
            file: './apps/web/Dockerfile',
            ignoreMode: IgnoreMode.DOCKER,
        });

        // Create a separate Docker image for migrations
        const migrationsDockerImageAsset = new DockerImageAsset(this, 'OpinodoSurveysMigrationsDockerImage', {
            directory: '../', // Specify the context directory
            file: './apps/migrations/Dockerfile',
            ignoreMode: IgnoreMode.DOCKER,
        });

        // Use the same Docker image but with a specific command for migrations
        const migrationContainer = migrationTask.addContainer('migrations', {
            image: ecs.EcrImage.fromDockerImageAsset(migrationsDockerImageAsset),
            essential: true,
            containerName: 'migrations',
            environmentFiles: [
                ecs.EnvironmentFile.fromBucket(props.bucket, props.envFileName),
            ],
            logging: ecs.LogDriver.awsLogs({streamPrefix: `ecs`, logGroup: migrationLogGroup}),
        });

        const webTask = new ecs.FargateTaskDefinition(this, `${projectName}-web`, {
            family: `${projectName}-web`,
            memoryLimitMiB: props.taskMemory,
            cpu: props.taskCPU,
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
            resources: [props.bucket.bucketArn + "/" + props.envFileName],
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

        const webContainer = webTask.addContainer('web', {
            image: ecs.EcrImage.fromDockerImageAsset(dockerImageAsset),
            essential: true,
            containerName: 'web',
            environmentFiles: [
                ecs.EnvironmentFile.fromBucket(props.bucket, props.envFileName),
            ],
            logging: ecs.LogDriver.awsLogs({streamPrefix: `ecs`, logGroup: webLogGroup}),
            portMappings: [{containerPort: 3000}],
            command: [
                "/bin/sh", 
                "-c", 
                "supercronic -quiet /app/docker/cronjobs & exec node apps/web/server.js"
            ]
        });

        webContainer.addMountPoints({
            sourceVolume: 'efs-volume',
            containerPath: '/home/nextjs/apps/web/uploads',
            readOnly: false
        });

        const webService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, `${projectName}-web-service`, {
            cluster: props.cluster,
            desiredCount: 1,
            taskDefinition: webTask,
            serviceName: 'web',
            assignPublicIp: true,
            minHealthyPercent: 100,
            maxHealthyPercent: 400,
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
            healthyHttpCodes: '200',
            interval: Duration.seconds(10),
            timeout: Duration.seconds(5),
        });

        // Create a dedicated security group for the migration task
        const migrationSecurityGroup = new ec2.SecurityGroup(this, 'MigrationSecurityGroup', {
            vpc: props.vpc,
            allowAllOutbound: true,
            description: 'Security group for database migrations task'
        });

        // Allow access to EFS from Fargate ECS
        fileSystem.connections.allowDefaultPortFrom(webService.service.connections);
        // Also allow access from the migration task
        fileSystem.connections.allowDefaultPortFrom(migrationSecurityGroup);

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

        const logReceivingLambdaFunction = new NodejsFunction(this, "LogReceivingLambdaFunction", {
            runtime: aws_lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, `/../lambda/alerter.ts`),
            handler: "handler",
            retryAttempts: 0,
            initialPolicy: [
                new iam.PolicyStatement({
                    actions: ["ssm:GetParameter", "ssm:GetParametersByPath"],
                    resources: ["*"]
                }),
            ],
            timeout: Duration.seconds(30),
        });

        const logGroupLambdaSubscription = new SubscriptionFilter(this, 'LogGroupLambdaSubscription', {
            logGroup: webLogGroup,
            destination: new aws_logs_destinations.LambdaDestination(logReceivingLambdaFunction),
            filterPattern: aws_logs.FilterPattern.anyTerm("ERROR", "CRITICAL", "Exception"),
        });

        // Create a Lambda function that will run the migration task
        const runMigrationLambda = new NodejsFunction(this, 'RunMigrationLambda', {
            runtime: aws_lambda.Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: path.join(__dirname, '../lambda/run-migration.ts'),
            timeout: Duration.minutes(15),
            environment: {
                CLUSTER_NAME: props.cluster.clusterName,
                TASK_DEFINITION_ARN: migrationTask.taskDefinitionArn,
                SUBNET_IDS: props.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
                SECURITY_GROUP_ID: migrationSecurityGroup.securityGroupId // Use the dedicated security group
            },
            initialPolicy: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'ecs:RunTask',
                        'ecs:DescribeTasks'
                    ],
                    resources: ['*']
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'iam:PassRole'
                    ],
                    resources: [
                        migrationTask.taskRole.roleArn, 
                        migrationTask.executionRole?.roleArn || '*'
                    ]
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'logs:CreateLogGroup',
                        'logs:CreateLogStream',
                        'logs:PutLogEvents',
                        'logs:DescribeLogGroups',
                        'logs:DescribeLogStreams'
                    ],
                    resources: ['*']
                })
            ]
        });

        // Create a custom resource that will trigger the Lambda to run the migration task
        const migrationCustomResource = new CustomResource(this, 'MigrationCustomResource', {
            serviceToken: runMigrationLambda.functionArn,
            properties: {
                // Add a timestamp to ensure the resource is updated on each deployment
                Timestamp: new Date().toISOString()
            }
        });

        // Make sure the migration custom resource depends on all resources it needs
        migrationCustomResource.node.addDependency(migrationTask);
        migrationCustomResource.node.addDependency(migrationSecurityGroup);
        migrationCustomResource.node.addDependency(runMigrationLambda);
        
        // Use the web service's CloudFormation resource to explicitly set a dependency
        // on the migration custom resource without creating a circular reference
        const cfnWebService = webService.service.node.defaultChild as CfnResource;
        cfnWebService.addDependency(migrationCustomResource.node.defaultChild as CfnResource);

        const redisSecurityGroup = new ec2.SecurityGroup(
          this,
          `${projectName}-redisCacheSecurityGroup`,
          {
              vpc: props.vpc,
              allowAllOutbound: true,
              description: "Security group for the redis cluster",
          }
        );
        
        // Use addIngressRule instead of depending on the webService directly
        redisSecurityGroup.addIngressRule(
          ec2.Peer.securityGroupId(webService.service.connections.securityGroups[0].securityGroupId),
          ec2.Port.allTraffic(),
          "Allow access to redis from the web service"
        );
        
        // Also allow the migration task to access Redis
        redisSecurityGroup.addIngressRule(
          ec2.Peer.securityGroupId(migrationSecurityGroup.securityGroupId),
          ec2.Port.allTraffic(),
          "Allow access to redis from the migration task"
        );

        // Create a subnet group
        const subnetGroup = new elasticcache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
            description: 'Subnet group for Redis',
            subnetIds: props.vpc.publicSubnets.map((subnet) => subnet.subnetId),
        });

        const redis = new elasticcache.CfnCacheCluster (this, `${projectName}-redis`, {
            engine: "redis" ,
            numCacheNodes: 1,
            cacheNodeType: props.cacheNodeType,
            clusterName: `${projectName}-redis`,
            vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
            cacheSubnetGroupName: subnetGroup.ref,
        });


        // Publish the web service ARN as an output
        new CfnOutput(this, 'EcsWebServiceArn', {
            value: webService.service.serviceArn,
            exportName: 'EcsWebServiceArn'
        });
    }
}

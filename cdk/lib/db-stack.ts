import {
    aws_ec2 as ec2,
    aws_ecr as ecr,
    aws_ecs as ecs,
    aws_ecs_patterns as ecsPatterns,
    aws_iam as iam,
    aws_rds as rds,
    aws_s3 as s3,
    CfnOutput,
    RemovalPolicy,
    Stack,
    StackProps
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {LogGroup} from "aws-cdk-lib/aws-logs";
import {Credentials, DatabaseInstanceEngine, DatabaseSecret, PerformanceInsightRetention} from "aws-cdk-lib/aws-rds";

interface ECSStackProps extends StackProps {
    dbMaxAllocatedStorage: number;
    dbAllocatedStorage: number;
    dbInstanceType: string;
    dbName: string;
    projectName: string;
    environment: string;
    env: { [key: string]: string } | undefined;
}

export class DatabaseStack extends Stack {
    constructor(scope: Construct, id: string, props: ECSStackProps) {
        super(scope, id, props);

        const projectName = props.projectName;

        const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {isDefault: true});

        const instanceIdentifier = 'postgres-01'
        const credsSecretName = `/${id}/rds/creds/${instanceIdentifier}`.toLowerCase()
        const creds = new DatabaseSecret(this, 'PostgresRdsCredentials', {
            secretName: credsSecretName,
            username: 'postgres'
        })


        const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
            vpc,
            description: 'Allow DB port in',
            allowAllOutbound: true
        });
        dbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432), "Allow all access");

        const dbInstance = new rds.DatabaseInstance(this, `${projectName}`, {
            engine: DatabaseInstanceEngine.postgres({version: rds.PostgresEngineVersion.VER_15}),
            vpc: vpc,
            credentials: Credentials.fromSecret(creds),
            allocatedStorage: props.dbAllocatedStorage,
            availabilityZone: vpc.availabilityZones[0],
            databaseName: props.dbName,
            publiclyAccessible: true,
            deleteAutomatedBackups: true,
            performanceInsightRetention: PerformanceInsightRetention.DEFAULT,
            instanceIdentifier: `${projectName}`,
            instanceType: new ec2.InstanceType(props.dbInstanceType),
            maxAllocatedStorage: props.dbMaxAllocatedStorage,
            securityGroups: [dbSecurityGroup],
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
        });

        if (props.environment === 'sandbox') {
            dbInstance.applyRemovalPolicy(RemovalPolicy.DESTROY);
        }
    }

}

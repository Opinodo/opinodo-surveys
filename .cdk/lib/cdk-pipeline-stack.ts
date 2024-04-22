import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import {CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep} from 'aws-cdk-lib/pipelines';
import {Construct} from 'constructs';
import {Params} from './params';
import {BaseStage} from "./base-stage";
import {ComputeType, LinuxArmBuildImage} from "aws-cdk-lib/aws-codebuild";

export class CdkPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const pipeline = new CodePipeline(this, 'Pipeline', {
            crossAccountKeys: true,
            synth: new ShellStep('Synth', {
                primaryOutputDirectory: './.cdk/cdk.out',
                input: CodePipelineSource.gitHub(Params.GITHUB_REPO, Params.BRANCH_NAME, {
                    authentication: SecretValue.secretsManager(Params.GITHUB_TOKEN)
                }),
                commands: ['cd .cdk', 'npm ci', 'npx cdk synth'],
            }),
            assetPublishingCodeBuildDefaults: {
                buildEnvironment: {
                    buildImage:  LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
                    computeType: ComputeType.LARGE
                }
            }
        });

        const stagingStage = new BaseStage(this, Params.PROJECT_NAME + '-Staging', {
            projectName: Params.PROJECT_NAME,
            environmentName: 'staging',
            envFileName: 'staging.env',
            dbName: 'DigiopinionSurveysDB',
            dbInstanceType: 't4g.micro',
            dbAllocatedStorage: 50,
            dbMaxAllocatedStorage: 512,
            taskMemory: 512,
            taskCPU: 256,
            certificateArn: Params.STAGING_CERTIFICATE_ARN,
            env: {
                account: Params.STAGING_ACCOUNT_ID,
                region: Params.AWS_REGION
            }
        });

        const prodStage = new BaseStage(this, Params.PROJECT_NAME + `-Prod`, {
            projectName: Params.PROJECT_NAME,
            environmentName: 'production',
            envFileName: 'production.env',
            dbName: 'DigiopinionSurveysDB',
            dbInstanceType: 't4g.medium',
            taskMemory: 8192,
            taskCPU: 4096,
            dbAllocatedStorage: 200,
            dbMaxAllocatedStorage: 1024,
            certificateArn: Params.PROD_CERTIFICATE_ARN,
            env: {
                account: Params.PROD_ACCOUNT_ID,
                region: Params.AWS_REGION
            }
        });

        const pipelineStagingStage = pipeline.addStage(stagingStage);

        // pipelineStagingStage.addPost(new ShellStep("albTest", {
        //   envFromCfnOutputs: {albAddress: stagingStage.albAddress},
        //   commands: ['curl -f -s -o /dev/null -w "%{http_code}" $albAddress']
        // }));

        const pipelineProdStage = pipeline.addStage(prodStage);

        pipelineProdStage.addPre(new ManualApprovalStep('ManualApproval', {}));
    }
}

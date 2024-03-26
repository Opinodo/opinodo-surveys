import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import {CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep} from 'aws-cdk-lib/pipelines';
import {Construct} from 'constructs';
import {Params} from './params';
import {BaseStage} from "./base-stage";

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
        });

        const stagingStage = new BaseStage(this, 'StagingStage', {
            projectName: Params.PROJECT_NAME,
            environmentName: 'staging',
            envFileName: 'staging.env',
            dbName: 'OpinodoSurveysDB',
            dbInstanceType: 't4g.micro',
            dbAllocatedStorage: 50,
            dbMaxAllocatedStorage: 512,
            certificateArn: Params.STAGING_CERTIFICATE_ARN,
            env: {
                account: Params.STAGING_ACCOUNT_ID,
                region: Params.AWS_REGION
            }
        });
        //
        const prodStage = new BaseStage(this, 'ProdStage', {
            projectName: Params.PROJECT_NAME,
            environmentName: 'production',
            envFileName: 'production.env',
            dbName: 'OpinodoSurveysDB',
            dbInstanceType: 't4g.medium',
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

import {Stack, StackProps, SecretValue} from 'aws-cdk-lib';
import {CodePipeline, CodePipelineSource, ShellStep, ManualApprovalStep} from 'aws-cdk-lib/pipelines';
import {Construct} from 'constructs';
import {BaseStage} from './base-stage';
import {Params} from './params';

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
                commands: ['cd .cdk', 'npm install', 'npx cdk synth'],
            }),
        });

        // const stagingStage = new BaseStage(this, 'StagingStage', {
        //   projectName: Params.PROJECT_NAME,
        //   environmentName: 'staging',
        //   dbName: 'OpinodoSurveysDB',
        //   dbInstanceType: 't4g.micro',
        //   dbAllocatedStorage: 50,
        //   dbMaxAllocatedStorage: 512,
        //   env: {
        //     account: Params.STAGING_ACCOUNT_ID,
        //     region: Params.AWS_REGION
        //   }
        // });

        // const prodStage = new BaseStage(this, 'ProdStage', {
        //   projectName: Params.PROJECT_NAME,
        //   environmentName: 'production',
        //   dbName: 'OpinodoSurveysDB',
        //   dbInstanceType: 't4g.medium',
        //   dbAllocatedStorage: 200,
        //   dbMaxAllocatedStorage: 1024,
        //   env: {
        //     account: Params.PROD_ACCOUNT_ID,
        //     region: Params.AWS_REGION
        //   }
        // });

        // const pipelineStagingStage = pipeline.addStage(stagingStage);
        // pipelineStagingStage.addPost(new ShellStep("albTest", {
        //   envFromCfnOutputs: {albAddress: stagingStage.albAddress},
        //   commands: ['curl -f -s -o /dev/null -w "%{http_code}" $albAddress']
        // }));

        // const pipelineProdStage = pipeline.addStage(prodStage);
        //
        // pipelineProdStage.addPre(new ManualApprovalStep('ManualApproval', {}));
    }
}

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {BaseStack} from "../lib/base-stack";
import {AppStack} from "../lib/app-stack";
import {CdkPipelineStack} from "../lib/cdk-pipeline-stack";
import {Params} from "../lib/params";

const app = new cdk.App();

const baseStack = new BaseStack(app, 'OpinodoSurveysBase', {
    projectName: "opinodo-surveys-db",
    environmentName: "sandbox",
    env: {account: '599781234736', region: 'eu-central-1'},
    dbMaxAllocatedStorage: 512,
    dbAllocatedStorage: 256,
    dbInstanceType: 't4g.micro',
    dbName: 'OpinodoSurveysDB'
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */

    /* Uncomment the next line to specialize this stack for the AWS Account
     * and Region that are implied by the current CLI configuration. */
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

new AppStack(app, 'OpinodoSurveysApp', {
    bucket: baseStack.bucket,
    cluster: baseStack.cluster,
    vpc: baseStack.vpc,
    projectName: "opinodo-surveys-app",
    environmentName: "sandbox",
    certificateArn: "arn:aws:acm:eu-central-1:599781234736:certificate/0f801ab4-cd43-4b53-92c3-79e88b032dc4",
    env: {account: '599781234736', region: 'eu-central-1'}

    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

new CdkPipelineStack(app, 'OpinodoSurveysPipeline', {
    env: {
        account: Params.TOOLING_ACCOUNT_ID,
        region: Params.AWS_REGION
    }
});

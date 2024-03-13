#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {ApplicationStack} from "../lib/application-stack";
import {DatabaseStack} from "../lib/db-stack";
import {aws_rds} from "aws-cdk-lib";

const app = new cdk.App();

new DatabaseStack(app, 'OpinodoSurveysDB', {
    projectName: "opinodo-surveys-db",
    environment: "sandbox",
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

new ApplicationStack(app, 'OpinodoSurveysApp', {
    projectName: "opinodo-surveys-app",
    environment: "sandbox",
    env: {account: '599781234736', region: 'eu-central-1'},

  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
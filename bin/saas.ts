#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SaasStack } from '../lib/saas-stack';

const app = new cdk.App();
new SaasStack(app, 'SaasStack');

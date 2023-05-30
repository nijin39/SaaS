#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SaasStack } from "../lib/saas-stack";
import { OnboardingStack } from "../lib/onboarding-stack";
import { UserManagementStack } from "../lib/user-management-stack";
import { AdminUserManagementStack } from "../lib/admin-user-management-stack";
import { BillingStack } from "../lib/billing-stack";
import { TenantManagementStack } from "../lib/tenant-management-stack";
import { ProvisioningStack } from "../lib/provisioning-stack";

const app = new cdk.App();
// new SaasStack(app, "SaasStack");

const userManagement = new UserManagementStack(app, "UserManagement");
new OnboardingStack(app, "Onboarding", {userManagement: userManagement.myLambda});
new AdminUserManagementStack(app, "AdminUserManagement");
new BillingStack(app, "Billing");
new TenantManagementStack(app, "TenantManagement");
new ProvisioningStack(app, "Provisioning");



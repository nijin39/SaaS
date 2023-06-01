import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";

export class UserManagementStack extends cdk.Stack {
  public readonly myLambda: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB 테이블 생성
    const table = new dynamodb.Table(this, "UserManagementTable", {
      partitionKey: { name: "tenantId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      tableName: "UserManagement",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 배포 시 테이블 삭제 설정
    });

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "FreeTireUserPool",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 배포 시 사용자 풀 삭제 설정
      selfSignUpEnabled: true,
      signInAliases: {
        username: true,
        email: false, // 이메일 사용하지 않음
      },
      customAttributes: {
        tenantId: new cognito.StringAttribute({ mutable: true }),
      },
    });

    this.myLambda = new lambda.Function(this, "UserManagementFunction", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "user-management.handler",
      code: lambda.Code.fromAsset("dist"),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName, // Lambda 함수 환경 변수에 테이블 이름 설정
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    // Define IAM policy for creating Cognito User Pool
    const cognitoUserPoolPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["cognito-idp:CreateUserPool", "cognito-idp:AdminCreateUser"],
      resources: ["*"], // Specify the resource ARN for a specific User Pool if needed
    });

    // Add the IAM policy to the Lambda function's execution role
    this.myLambda.addToRolePolicy(cognitoUserPoolPolicy);

    // Define IAM policy for accessing Cognito User Pool
    const cognitoPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminAddUserToGroup",
        // Add other necessary Cognito actions here
      ],
      resources: [
        userPool.userPoolArn,
        // Add other necessary Cognito resources here
      ],
    });

    // Add the IAM policy to the Lambda function's execution role
    this.myLambda.addToRolePolicy(cognitoPolicy);

    // DynamoDB 테이블에 대한 Lambda 함수의 권한 설정
    table.grantReadWriteData(this.myLambda);

    const api = new apigateway.RestApi(this, "UserManagementAPI", {
      restApiName: "UserManagement",
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(this.myLambda);

    api.root.addMethod("ANY", lambdaIntegration);

    new cdk.CfnOutput(this, "LambdaFunctionArn", {
      value: this.myLambda.functionArn,
    });
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
    });
  }
}

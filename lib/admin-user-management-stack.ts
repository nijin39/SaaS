import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class AdminUserManagementStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB 테이블 생성
    const table = new dynamodb.Table(this, "AdminUserManagementTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      tableName: "AdminUserManagement",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 배포 시 테이블 삭제 설정
    });

    const myLambda = new lambda.Function(this, "AdminUserManagementFunction", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "admin-user-management.handler",
      code: lambda.Code.fromAsset("dist"),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName, // Lambda 함수 환경 변수에 테이블 이름 설정
      },
    });

    // DynamoDB 테이블에 대한 Lambda 함수의 권한 설정
    table.grantReadWriteData(myLambda);

    const api = new apigateway.RestApi(this, "AdminUserManagementAPI", {
      restApiName: "AdminUserManagement",
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(myLambda);

    api.root.addMethod("ANY", lambdaIntegration);

    new cdk.CfnOutput(this, "LambdaFunctionArn", {
      value: myLambda.functionArn,
    });
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
    });
  }
}

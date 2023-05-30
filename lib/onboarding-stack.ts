import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as stepfunctions_tasks from "aws-cdk-lib/aws-stepfunctions-tasks";

// OnboardingStack에 전달되는 프로퍼티 정의
interface OnboardingStackProps extends cdk.StackProps {
  userManagement: lambda.Function;
}

export class OnboardingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OnboardingStackProps) {
    super(scope, id, props);

    // DynamoDB 테이블 생성
    const table = new dynamodb.Table(this, "OnboardingTable", {
      partitionKey: { name: "tenantId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      tableName: "OnboardingTable",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 배포 시 테이블 삭제 설정
    });

    // Step Function 생성
    const stateMachine = new stepfunctions.StateMachine(
      this,
      "MyStateMachine",
      {
        definition: this.createStateMachineDefinition(props.userManagement),
      }
    );

    const myLambda = new lambda.Function(this, "MyLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "onboarding.handler",
      code: lambda.Code.fromAsset("dist"),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName, // Lambda 함수 환경 변수에 테이블 이름 설정
        STATE_MACHINE: stateMachine.stateMachineArn,
      },
    });

    stateMachine.grantStartExecution(myLambda);

    // DynamoDB 테이블에 대한 Lambda 함수의 권한 설정
    table.grantReadWriteData(myLambda);

    const api = new apigateway.RestApi(this, "MyApi", {
      restApiName: "My API",
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

  // Step Function을 제어하기 위한 메서드 정의
  private createStateMachineDefinition(
    lambdaFunction: lambda.Function
  ): stepfunctions.IChainable {
    // Step Function 상태 정의
    const invokeLambdaTask = new tasks.LambdaInvoke(this, "InvokeLambda", {
      lambdaFunction,
      payloadResponseOnly: true,
    });

    // Step Function 상태를 연결하여 정의
    return invokeLambdaTask;
  }
}

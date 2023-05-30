import * as AWS from "aws-sdk";
import { Handler } from "aws-lambda";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const STATE_MACHINE = process.env.STATE_MACHINE!;

export const handler: Handler = async (event, context) => {
  let newItem; // newItem 변수를 함수 스코프 내에서 정의합니다.

  try {
    if (event.httpMethod === "POST") {
      // POST 요청 처리
      const requestBody = JSON.parse(event.body);
      newItem = {
        tenantId: requestBody.tenantId,
        userId: requestBody.userId,
        tier: requestBody.tier,
      };
    }

    await putDataToDynamoDB(newItem);

    const stepFunctions = new AWS.StepFunctions();

    // Start the execution of the Step Function
    const execution = await stepFunctions
      .startExecution({
        stateMachineArn: STATE_MACHINE,
        input: JSON.stringify(newItem),
      })
      .promise();

    // Get the execution ARN
    const executionArn = execution.executionArn;

    return {
      statusCode: 200,
      body: JSON.stringify(newItem),
    };
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
};

async function putDataToDynamoDB(item: any) {
  const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
    TableName: process.env.TABLE_NAME!,
    Item: item,
  };

  await dynamoDB.put(params).promise();
}

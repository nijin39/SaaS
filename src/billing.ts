import * as AWS from "aws-sdk";
import { Handler } from "aws-lambda";

const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const handler: Handler = async (event, context) => {
  try {
    // DynamoDB에 데이터 삽입
    await putDataToDynamoDB();

    // DynamoDB에서 데이터 조회
    const data = await getDataFromDynamoDB();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
};

async function putDataToDynamoDB() {
  const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
    TableName: process.env.TABLE_NAME!,
    Item: {
      id: "exampleId",
      name: "Example Name",
    },
  };

  await dynamoDB.put(params).promise();
}

async function getDataFromDynamoDB() {
  const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
    TableName: process.env.TABLE_NAME!,
    Key: {
      id: "exampleId",
    },
  };

  const result = await dynamoDB.get(params).promise();
  return result.Item;
}

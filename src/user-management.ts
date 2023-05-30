import * as AWS from "aws-sdk";
import { Handler } from "aws-lambda";
import { TerminationPolicy } from "aws-cdk-lib/aws-autoscaling";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler: Handler = async (event, context) => {
  try {
    const { tier, userId, tenantId } = event;
    if (tier === "free") {
      await addUserToFreeTierUserPool(userId, tenantId);

      // DynamoDB에 데이터 삽입
      await putDataToDynamoDB({
        ...event,
        userPoolId: process.env.USER_POOL_ID!,
      });
    } else if (tier === "pro" || tier === "business") {
      const params: AWS.DynamoDB.DocumentClient.QueryInput = {
        TableName: process.env.TABLE_NAME!,
        KeyConditionExpression: "tenantId = :tenantId",
        ExpressionAttributeValues: {
          ":tenantId": tenantId,
        },
      };

      try {
        const result = await dynamoDB.query(params).promise();
        if (result.Items && result.Items.length > 0) {
          return result.Items;
        } else {
          const createdUserPoolId = await createUserPool(tenantId, tier);

          await putDataToDynamoDB({
            ...event,
            userPoolId: createdUserPoolId,
          });

          addUserToUserPool(userId, tenantId, createdUserPoolId!);
          return [];
        }
      } catch (error) {
        console.error("Error querying DynamoDB:", error);
        throw error;
      }
    } else {
      console.log("Error");
    }

    return {
      statusCode: 200,
      body: "Successful Added",
    };
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
};

async function addUserToFreeTierUserPool(userId: any, tenantId: any) {
  const cognitoIdentityServiceProvider =
    new AWS.CognitoIdentityServiceProvider();
  const userPoolId = process.env.USER_POOL_ID!;
  // Define the user attributes
  const userAttributes: AWS.CognitoIdentityServiceProvider.AttributeListType = [
    {
      Name: "name",
      Value: userId,
    },
    {
      Name: "custom:tenantId",
      Value: tenantId,
    },
    // Add additional attributes as needed
  ];

  const createUserParams: AWS.CognitoIdentityServiceProvider.AdminCreateUserRequest =
    {
      UserPoolId: userPoolId,
      Username: userId,
      TemporaryPassword: "TempPassword123!",
      UserAttributes: userAttributes,
      MessageAction: "SUPPRESS",
    };

  const createUserResponse = await cognitoIdentityServiceProvider
    .adminCreateUser(createUserParams)
    .promise();
}

async function addUserToUserPool(
  userId: any,
  tenantId: any,
  userPoolId: string
) {
  const cognitoIdentityServiceProvider =
    new AWS.CognitoIdentityServiceProvider();
  // Define the user attributes
  const userAttributes: AWS.CognitoIdentityServiceProvider.AttributeListType = [
    {
      Name: "name",
      Value: userId,
    },
    {
      Name: "custom:tenantId",
      Value: tenantId,
    },
    // Add additional attributes as needed
  ];

  const createUserParams: AWS.CognitoIdentityServiceProvider.AdminCreateUserRequest =
    {
      UserPoolId: userPoolId,
      Username: userId,
      TemporaryPassword: "TempPassword123!",
      UserAttributes: userAttributes,
      MessageAction: "SUPPRESS",
    };

  const createUserResponse = await cognitoIdentityServiceProvider
    .adminCreateUser(createUserParams)
    .promise();
}

async function putDataToDynamoDB(item: any) {
  const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
    TableName: process.env.TABLE_NAME!,
    Item: item,
  };

  await dynamoDB.put(params).promise();
}

async function createUserPool(tenantId: string, tier: string) {
  const cognitoIdentityServiceProvider =
    new AWS.CognitoIdentityServiceProvider();

  const poolName = tenantId + tier + "UserPool"; // 풀 이름 설정
  const usernameConfiguration: AWS.CognitoIdentityServiceProvider.UsernameConfigurationType =
    {
      CaseSensitive: false,
    };
  const autoVerifiedAttributes: string[] = []; // 이메일 사용하지 않으므로 빈 배열로 설정

  const schema: AWS.CognitoIdentityServiceProvider.SchemaAttributeType[] = [
    {
      AttributeDataType: "String",
      Name: "tenantId",
      Required: false,
      Mutable: true,
    },
  ];

  const params: AWS.CognitoIdentityServiceProvider.CreateUserPoolRequest = {
    PoolName: poolName,
    UsernameConfiguration: usernameConfiguration,
    AutoVerifiedAttributes: autoVerifiedAttributes,
    Schema: schema,
  };

  try {
    const result = await cognitoIdentityServiceProvider
      .createUserPool(params)
      .promise();
    return result.UserPool!.Id;
  } catch (error) {
    console.error("Error creating User Pool:", error);
    throw error;
  }
}

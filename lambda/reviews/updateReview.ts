import { Handler } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb";

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => { // Note change 
    const parameters  = event?.pathParameters;
    const movieId = parameters?.movieId;
    const reviewerName = parameters?.reviewerName;
    const reviewText = event?.body;

    try {
        const commandOutput = await ddbDocClient.send(
            new UpdateCommand({
                TableName: "Reviews",
                Key: {
                    movieId: Number(movieId),
                    username: reviewerName,
                },
                UpdateExpression: "set review = :reviewText",
                ExpressionAttributeValues: {
                    ":reviewText": reviewText,
                },
            })
        );

        console.log("UpdateCommand response: ", commandOutput);
        
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Review updated" }),
        };


    } catch (error) {
        console.error(error);

        return {
            statusCode: 500,
            body: 'Something went wrong',
        };
    }
};


function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
      wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
  }
  
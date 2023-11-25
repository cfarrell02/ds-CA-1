import { Handler } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => { // Note change 
  try {
    // Print Event
    console.log("Event: ", event);
    const parameters = event?.pathParameters;
    const movieId = parameters?.movieId;
    const queryStrings = event?.queryStringParameters;
    const minRating = Number(queryStrings?.minRating);



    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }

    const query: QueryCommandInput = {
      TableName: "Reviews",
      KeyConditionExpression: "movieId = :movieId",
      ExpressionAttributeValues: {
        ":movieId": Number(movieId),
      },
    };

    // Check if minRating is provided, and add FilterExpression if needed
    if (minRating) {
      query.FilterExpression = "rating >= :minRating";
      query.ExpressionAttributeValues![":minRating"] = minRating;
    }

    const commandOutput = await ddbDocClient.send(
      new QueryCommand(query)
    );


    console.log("GetCommand response: ", commandOutput);
    if (!commandOutput.Items) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "No Reviews Found" }),
      };
    }
    let body = {
      data: commandOutput.Items,
      count: commandOutput.Count,
      movieId: movieId
    };

    // Return Response
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
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

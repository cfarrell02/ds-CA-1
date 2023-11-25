import { Handler } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommandOutput, QueryCommand, GetCommandOutput, GetCommand } from "@aws-sdk/lib-dynamodb";

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => { // Note change 
  try {
    // Print Event
    console.log("Event: ", event);
    const parameters = event?.pathParameters;
    const movieId = parameters?.movieId;
    const type = parameters?.type;

    //Checking for MovieId
    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }
    //Checking for ReviewerName
    if (!type) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing type" }),
      };
    }

    let queryType = "";
    let commandOutput;

    //Regex on type to see if it is 20NN aka a year
    const regex = new RegExp("20[0-9][0-9]");
    if (regex.test(type)) {
      // Type is a year, so want to compare to first 4 digits of reviewDate
      commandOutput = await ddbDocClient.send(
        new QueryCommand(
          {
            TableName: "Reviews",
            KeyConditionExpression: "movieId = :movieId",
            FilterExpression: "begins_with(reviewDate, :type)",
            ExpressionAttributeValues: {
              ":movieId": Number(movieId),
              ":type": type.substring(0, 4)
            },
          }));
      queryType = "year";
    } else {
      // Type is a reviewer name so do get
      commandOutput = await ddbDocClient.send(
        new GetCommand({
          TableName: "Reviews",
          Key: {
            movieId: Number(movieId),
            username: type
          },
        })
      );
      queryType = "reviewer";
    }

    const result = commandOutput.Items ? commandOutput.Items : commandOutput.Item;


    console.log("GetCommand response: ", commandOutput);
    if (!result) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "No Reviews Found" }),
      };
    }
    let body = {
      data: result,
      count: commandOutput.Count ? commandOutput.Count : 1,
      queryType: queryType,
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

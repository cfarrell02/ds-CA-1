import { Handler } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommandOutput, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

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

    const query: QueryCommandInput = {
      TableName: "Reviews",
      KeyConditionExpression: "movieId = :movieId",
      ExpressionAttributeValues: {
        ":movieId": Number(movieId),
      },
    };

    let queryType = "";

    //Regex on type to see if it is 20NN 
    const regex = new RegExp("20[0-9][0-9]");
    if (regex.test(type)) {
      // Type is a year, so want to compare to first 4 digits of reviewDate
      query.KeyConditionExpression += " AND begins_with(reviewDate, :type)";
      query.ExpressionAttributeValues![":type"] = type.substring(0, 4);
      queryType = "year";
    } else {
      // Assume it is a reviewer name
      query.FilterExpression = "username = :type"
      query.ExpressionAttributeValues![":type"] = type;
      queryType = "reviewer";
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

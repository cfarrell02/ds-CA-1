import { Handler } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommandOutput, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, ListLanguagesCommand, TranslateTextCommand } from "@aws-sdk/client-translate";

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => { // Note change 
  try {
    // Print Event
    console.log("Event: ", event);
    const parameters = event?.pathParameters;
    const movieId = parameters?.movieId;
    const reviewName = parameters?.type;
    const languageCode = event?.queryStringParameters?.language;

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
    if (!reviewName) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing reviewer name" }),
      };
    }

    if (!languageCode) {
        return {
            statusCode: 404,
            headers: {
            "content-type": "application/json",
            },
            body: JSON.stringify({ Message: "Missing language code; please provide a language"}),
        };
        }

    const query: QueryCommandInput = {
      TableName: "Reviews",
      KeyConditionExpression: "movieId = :movieId AND username = :reviewName",
      ExpressionAttributeValues: {
        ":movieId": Number(movieId),
        ":reviewName": reviewName
      },
    };

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
      languageCode: languageCode.toUpperCase(),
      movieId: movieId
    };

    // Translate Review Text
    const translatedReviewText = await translateReviewText(commandOutput.Items[0].review, languageCode);
    body.data[0].review = translatedReviewText;


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


async function translateReviewText(reviewText: string, languageCode: string) {
  const translateClient = new TranslateClient({ region: process.env.REGION });
  const translateParams = {
    Text: reviewText,
    SourceLanguageCode: "en",
    TargetLanguageCode: languageCode,
  };
  const translateCommand = new TranslateTextCommand(translateParams);
  const translateOutput = await translateClient.send(translateCommand);
  return translateOutput.TranslatedText;
  
}
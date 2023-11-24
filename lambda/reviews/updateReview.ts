import { Handler } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, UpdateCommandInput} from "@aws-sdk/lib-dynamodb";

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => { // Note change 
    try {
        const parameters  = event?.pathParameters;
        const movieId = parameters?.movieId;
        const reviewerName = parameters?.type;
        const body = event.body ? JSON.parse(event.body) : undefined;
        const reviewText = body.review;
        const ratingNumber = Number(body.rating);
    
    if(!body || !reviewText) {
        return {
            statusCode: 404,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ Message: "Missing review text, rating is optional" , schema: "{review: string , rating: number}"}),
        };
    }

    const updateCommand: UpdateCommandInput = {
        TableName: "Reviews",
        Key: {
            movieId: Number(movieId),
            username: reviewerName,
        },
        UpdateExpression: "set review = :reviewText",
        ExpressionAttributeValues: {
            ":reviewText": reviewText,
        },
    }


    if (ratingNumber) {
        if(ratingNumber<0 || ratingNumber>10) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Rating must be between 0 and 10" }),
            };
        }

        updateCommand.UpdateExpression += ", rating = :ratingNumber";
        updateCommand.ExpressionAttributeValues![":ratingNumber"] = ratingNumber;
    }

        const commandOutput = await ddbDocClient.send(
            new UpdateCommand(updateCommand)
        );

        console.log("UpdateCommand response: ", commandOutput);
        
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Review updated"}),
        };


    } catch (error) {
        console.error(error);

        return {
            statusCode: 500,
            body: JSON.stringify({ error , message: "Error updating review, Please ensure you have provided a valid JSON request body with a review property. See error for more details"}),
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
  
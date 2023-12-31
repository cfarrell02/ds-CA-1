import { Aws } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/utils";
import { movies, reviews } from "../seedData/movies";
import * as iam from 'aws-cdk-lib/aws-iam';



type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export class AppApi extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);



    // Table
    const reviewTable = new dynamodb.Table(this, "ReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "username", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Reviews"
    })

    const appCommonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    };

    const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
      ...appCommonFnProps,
      entry: "./lambda/auth/authorizer.ts",
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );

    // Movies Functions



    //Review functions

    const getReviewsByMovieFn = new lambdanode.NodejsFunction(this, "getReviewsByMovieFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `./lambda/reviews/getReviewsByMovie.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: reviewTable.tableName,
        REGION: "eu-west-1",
      },
    })

    const addReviewFn = new lambdanode.NodejsFunction(this, "addReviewFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `./lambda/reviews/addReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: reviewTable.tableName,
        REGION: "eu-west-1",
      },
    })

    const getReviewsByTypeFn = new lambdanode.NodejsFunction(this, "getReviewsByTypeFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `./lambda/reviews/getReviewsByType.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: reviewTable.tableName,
        REGION: "eu-west-1",
      },
    })

    const getReviewsByReviewerFn = new lambdanode.NodejsFunction(this, "getReviewsByReviewerFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `./lambda/reviews/getReviewsByName.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: reviewTable.tableName,
        REGION: "eu-west-1",
      },
    })

    const getTranslatedReviewFn = new lambdanode.NodejsFunction(this, "getTranslatedReviewFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `./lambda/reviews/getTranslatedReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: reviewTable.tableName,
        REGION: "eu-west-1",
      },
    })

    const updateReviewFn = new lambdanode.NodejsFunction(this, "updateReviewFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `./lambda/reviews/updateReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: reviewTable.tableName,
        REGION: "eu-west-1",
      },
    })

    // Seeding the tables
    new custom.AwsCustomResource(this, "moviesddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [reviewTable.tableName]: generateBatch(reviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [reviewTable.tableArn],
      }),
    });


    // Permissions

    reviewTable.grantReadData(getReviewsByMovieFn)
    reviewTable.grantReadWriteData(addReviewFn)
    reviewTable.grantReadWriteData(updateReviewFn)
    reviewTable.grantReadData(getReviewsByTypeFn)
    reviewTable.grantReadData(getReviewsByReviewerFn)
    reviewTable.grantReadData(getTranslatedReviewFn)

    // Permission to access translate service for translation

    const translatePolicyStatement = new iam.PolicyStatement({
      actions: ["translate:TranslateText"],
      resources: ["*"],
    });

    getTranslatedReviewFn.addToRolePolicy(translatePolicyStatement)



    // API Gateway

    const appApi = new apig.RestApi(this, "AppApi", {
      description: "App RestApi",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      }
    });



    // /movies
    const moviesEndpoint = appApi.root.addResource("movies");


    // /movies/{movieId}  
    const publicMovie = moviesEndpoint.addResource("{movieId}");


    // /movies/reviews
    const reviewsEndpoint = moviesEndpoint.addResource("reviews");

    reviewsEndpoint.addMethod("POST", new apig.LambdaIntegration(addReviewFn, { proxy: true }),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      });
    // /movies/reviews/{reviewerName}
    const reviewsNameEndpoint = reviewsEndpoint.addResource("{reviewerName}");

    reviewsNameEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByReviewerFn, { proxy: true }));
    // /movies/{movieId}/reviews
    const reviewEndpoint = publicMovie.addResource("reviews");

    reviewEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByMovieFn, { proxy: true }));
    // /movies/{movieId}/reviews/{type}
    const reviewerEndpoint = reviewEndpoint.addResource("{type}");

    reviewerEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByTypeFn, { proxy: true }));

    reviewerEndpoint.addMethod("PUT", new apig.LambdaIntegration(updateReviewFn, { proxy: true }), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });
    // /movies/{movieId}/reviews/{type}/translation
    const translationEndpoint = reviewerEndpoint.addResource("translation");

    translationEndpoint.addMethod("GET", new apig.LambdaIntegration(getTranslatedReviewFn, { proxy: true }));

  }
}

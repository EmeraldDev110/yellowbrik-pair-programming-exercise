const {
  CreateTableCommand,
  DescribeTableCommand,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const dynamoDBClient = require("../dynamoDBClient");
const redisClient = require("../redisClient");
const request = require("supertest");
const app = require("../index");

// Helper function to wait for table creation
const waitForTableCreation = async (tableName) => {
  let tableReady = false;
  while (!tableReady) {
    try {
      const tableInfo = await dynamoDBClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      if (tableInfo.Table.TableStatus === "ACTIVE") {
        tableReady = true;
      }
    } catch (err) {
      console.log("Waiting for table to be created...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // wait for 1 second before retrying
    }
  }
};

beforeAll(async () => {
  // Create the Posts table before running tests
  const createTableParams = {
    TableName: "Posts",
    KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" }, // String type
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  try {
    await dynamoDBClient.send(new CreateTableCommand(createTableParams));
    console.log("Posts table created");
  } catch (error) {
    if (error.name !== "ResourceInUseException") {
      console.error("Error creating table:", error);
    }
  }

  // Wait for the table to be in ACTIVE status
  await waitForTableCreation("Posts");
});

afterAll(async () => {
  await redisClient.quit(); // Close Redis connection
  await dynamoDBClient.destroy(); // Close DynamoDB client connection
});

describe("POST /posts", () => {
  it("should create a new post and invalidate Redis cache", async () => {
    const post = {
      id: "123",
      title: "Test Post",
      content: "This is a test post.",
    };

    const response = await request(app).post("/posts").send(post);
    expect(response.statusCode).toBe(201);

    const cachedPosts = await redisClient.get("posts:page:1");
    expect(cachedPosts).toBeNull();
  });
});

describe("GET /posts", () => {
  beforeAll(async () => {
    const params = {
      TableName: "Posts",
      Item: {
        id: { S: "123" },
        title: { S: "Test Post" },
        content: { S: "This is a test post." },
      },
    };
    await dynamoDBClient.send(new PutItemCommand(params));
  });

  it("should return posts from DynamoDB and cache them in Redis", async () => {
    const response = await request(app).get("/posts?page=1");
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);

    const cachedPosts = await redisClient.get("posts:page:1");
    expect(cachedPosts).not.toBeNull();
  });
});

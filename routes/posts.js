const express = require("express");
const redisClient = require("../redisClient");
const dynamoDBClient = require("../dynamoDBClient");
const { ScanCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const router = express.Router();

router.get("/", async (req, res) => {
  const page = req.query.page || 1;
  const limit = 10;
  const cacheKey = `posts:page:${page}`;

  // Try to get cached results from Redis
  const cachedPosts = await redisClient.get(cacheKey);
  if (cachedPosts) {
    return res.json(JSON.parse(cachedPosts));
  }

  // If cache miss, fetch from DynamoDB
  const params = {
    TableName: "Posts",
    Limit: limit,
  };

  try {
    const result = await dynamoDBClient.send(new ScanCommand(params));

    // Cache the result in Redis for 10 minutes
    await redisClient.set(cacheKey, JSON.stringify(result.Items), {
      EX: 600,
    });

    res.json(result.Items);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/", async (req, res) => {
  const { id, title, content } = req.body;

  const params = {
    TableName: "Posts",
    Item: {
      id: { S: id },
      title: { S: id },
      content: { S: content },
    },
  };
  try {
    await dynamoDBClient.send(new PutItemCommand(params));

    // Invalidate cache when new post is added
    await redisClient.flushDb();

    res.status(201).json({ message: "Post created" });
  } catch (err) {
    res.status(500).json({ error: "Failed to craete post" });
  }
});

module.exports = router;

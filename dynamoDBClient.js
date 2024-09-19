const Dynalite = require("dynalite");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

// Start Dynalite (local DynamoDB emulator)
const dynalite = Dynalite({ createTableMs: 50 });

dynalite.listen(8000, (err) => {
  if (err) throw err;
  console.log("Dynalite started on port 8000");
});

//DynamoDB client configured to use Dynalite
const dynamoDBClient = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "us-east-1",
});

module.exports = dynamoDBClient;

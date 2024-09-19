require("dotenv").config();

const express = require("express");
const app = express();
const postsRouter = require("./routes/posts");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/posts", postsRouter);

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;

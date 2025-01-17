const dotenv = require("dotenv");
const http = require("http");
const connectDB = require("./src/utils/db");
const { app } = require("./app");
const { v2: cloudinary } = require("cloudinary");

const server = http.createServer(app);

dotenv.config();

// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

// create server
server.listen(process.env.PORT, () => {
  console.log(`Server is connected with port ${process.env.PORT}`);
  connectDB();
});
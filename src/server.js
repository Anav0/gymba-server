require("dotenv").config();
import mongoose from "mongoose";
import app from "./api";
import chat from "../src/service/socket";

const server = require("http").Server(app);

try {
  mongoose.connect(`${process.env.MONGO_CONNECTION_STRING}`,
    { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true },
    error => {
      if (error) console.error(error);
    }
  );
  server.listen(process.env.SERVER_PORT);
} catch (error) {
  console.error(error)
}

export default server;
require("dotenv").config();
import mongoose from "mongoose";
import app from "./api";
import { initializeSocket } from "../src/service/socket";

const server = require("http").Server(app);
initializeSocket(server)
try {
  mongoose.connect(`${process.env.MONGO_CONNECTION_STRING}`,
    { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true },
    error => {
      if (error) console.error(error);
    }
  );

  server.listen(4000);
} catch (error) {
  console.error(error)
}
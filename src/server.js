require("dotenv").config();
import mongoose from "mongoose";
import app from "./api";
const server = require("http").Server(app);

try {
  mongoose.connect(`${process.env.MONGO_CONNECTION_STRING}`,
    { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true },
    error => {
      if (error) console.error(error);
    }
  );

  server.listen(3000);
} catch (error) {
  console.error(error)
}
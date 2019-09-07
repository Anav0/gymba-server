require("dotenv").config();
import app from "./api";
const server = require("http").Server(app);
import mongoose from "mongoose";

try {
  mongoose.connect(`${process.env.MONGO_CONNECTION_STRING}`,
    { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true },
    err => {
      if (err) console.error(err);
    }
  );

  server.listen(3000);
} catch (err) {
  console.error(err)
}
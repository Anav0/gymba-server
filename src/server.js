var app = require("express")();
require("dotenv").config();
var server = require("http").Server(app);
import { initializeSocket } from "./service/socket"
import { initializeApi } from "./service/api"
import mongoose from "mongoose";

//TODO: Add mongo transactions
mongoose.connect(`${process.env.MONGO_CONNECTION_STRING}`,
  { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true },
  err => {
    if (err) console.error(err);
  }
);

initializeSocket(server)
initializeApi(app, mongoose)

server.listen(8000);
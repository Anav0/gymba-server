import cors from "cors";
import multer from "multer";
import passport from "passport";
import bodyParser from "body-parser";
import {
  MessageModel,
  ConversationModel,
  InvitationModel,
  UserModel
} from "../models";
import moment from "moment";
import Base = moment.unitOfTime.Base;
import session from "express-session";
import settings from "../settings";
import userEndpoints from "./user";
import usersEndpoints from "./users";
import authEndpoints from "./auth";
import inviteEndpoints from "./invite";
import conversationEndpoints from "./conversation";
import opinionEndpoints from "./opinion";
import messageEndpoints from "./message";
import botEndpoints from "./bot";
import express from "express";
import rateLimit from "express-rate-limit";
import { MongoDbService } from "../service/dbService";
import { VerificationModel } from "../models/verification";

const dbService = new MongoDbService();

dbService.connect();

const app = express();

//TODO: Add  friendships table to DB to store information about friendships duration, etc etc.
console.log("Initializing API...");
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    //don't save session if unmodified
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: false,
      expires: new Date(
        moment()
          .add(settings.cookies.validFor, settings.cookies.unit as Base)
          .toDate()
      )
    },
    store: dbService.getStore()
  })
);

//for parsing application/xwww...
app.use(bodyParser.urlencoded({ extended: true }));

//for parsing json
app.use(bodyParser.json());

// apply to all requests
app.use(
  rateLimit({
    windowMs: settings.rateLimit.for,
    max: settings.rateLimit.limit
  })
);

app.use(multer().any());
app.use(passport.initialize());
app.use(passport.session());
app.use("/user", userEndpoints);
app.use("/users", usersEndpoints);
app.use("/auth", authEndpoints);
app.use("/invite", inviteEndpoints);
app.use("/conversation", conversationEndpoints);
app.use("/opinion", opinionEndpoints);
app.use("/message", messageEndpoints);
app.use("/bot", botEndpoints);

app.use((error, req, res, next) => {
  console.log(error);
  if (error.name == "CastError")
    return res
      .status(400)
      .json({ errors: [`Invalid parameter: ${error.value}`] });
  return res.status(error.status || 500).json({ errors: [error.message] });
});
try {
  VerificationModel.createCollection();
  UserModel.createCollection();
  ConversationModel.createCollection();
  MessageModel.createCollection();
  InvitationModel.createCollection();
} catch (error) {
  console.error(error);
}
console.log("Done!");

export function isLoggedIn(req, res, next) {
  if (req.user) return next();
  return res.status(403).json({ errors: ["You are not authenticated"] });
}

export default app;

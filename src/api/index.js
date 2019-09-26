var cors = require("cors");
const MongoStore = require("connect-mongo")(session);
import multer from "multer";
import passport from "passport";
import bodyParser from "body-parser";
import { MessageModel, ConversationModel, InvitationModel, UserModel } from "../schemas";
import "../strategies/local_strategy";
import moment from "moment";
import * as sendgrid from "../service/sendgrid";
import session from "express-session";
import settings from "../settings";
import userEndpoints from "./user";
import usersEndpoints from "./users";
import authEndpoints from "./auth";
import inviteEndpoints from "./invite";
import conversationEndpoints from "./conversation";
import opinionEndpoints from "./opinion";
import messageEndpoints from "./message";
import mongoose from "mongoose"
import express from 'express';
const app = express();

//TODO: Add  friendships table to DB to store information about friendships duration, etc etc.
console.log("Initializing API...")
app.use(cors({
    origin: true,
    credentials: true,
}));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        //don't save session if unmodified
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: false, expires: new Date(moment().add(settings.cookies.validFor, settings.cookies.unit)) },
        store: new MongoStore({ mongooseConnection: mongoose.connection })
    })
);

//for parsing application/xwww...
app.use(bodyParser.urlencoded({ extended: true }));

//for parsing json
app.use(bodyParser.json());

// for parsing multipart/form-data
app.use(multer().array());
app.use(passport.initialize());
app.use(passport.session());
app.use("/user", userEndpoints)
app.use("/users", usersEndpoints)
app.use("/auth", authEndpoints)
app.use("/invite", inviteEndpoints)
app.use("/conversation", conversationEndpoints)
app.use("/opinion", opinionEndpoints)
app.use("/message", messageEndpoints)
app.use((error, req, res, next) => {
    return res.status(error.status || 500).json({ errors: [error.message] })
})
try {
    UserModel.createCollection();
    ConversationModel.createCollection();
    MessageModel.createCollection();
    InvitationModel.createCollection();

} catch (error) {
    console.error(error)
}
console.log("Done!")


export function isLoggedIn(req, res, next) {
    if (req.user) return next();
    return res.status(403).json({ errors: ["You are not authenticated"] });
}

export function sendEmailVerification(userId, email, token) {
    //Create verification link containing user id and token
    const verificationLink = `${process.env.SERVER_URL}/auth/verify/${userId}/${token}`;
    const htmlLink = `<a href="${verificationLink}">link</a>`;
    const messageOne = 'This is your email verification link:';
    const messageTwo = `it will expire in ${settings.validationEmail.validFor} ${settings.validationEmail.unit}`;

    //Send verification email
    return sendgrid.sendMessage(
        email,
        "igor_motyka@mail.com",
        "Chat account verification",
        `${messageOne} ${verificationLink} ${messageTwo}`,
        `<p> ${messageOne} ${htmlLink} ${messageTwo} </p>`)
}

export default app;
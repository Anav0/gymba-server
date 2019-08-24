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
import { setupConversationEndpoints } from "./conversation";
import { setupInviteEndpoints } from "./invite";
import { setupLoginEndpoints } from "./login";
import { setupOpinionEndpoints } from "./opinion";
import { setupUserEndpoints } from "./user";
import { setupUsersEndpoints } from "./users";
import { setupVerificationEndpoints } from "./verification";

export const initializeApi = async (app, mongoose) => {
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

    try {
        await UserModel.createCollection();
        await ConversationModel.createCollection();
        await MessageModel.createCollection();
        await InvitationModel.createCollection();

        setupConversationEndpoints(app)
        setupInviteEndpoints(app, mongoose)
        setupLoginEndpoints(app)
        setupOpinionEndpoints(app)
        setupUserEndpoints(app, mongoose)
        setupUsersEndpoints(app)
        setupVerificationEndpoints(app)

    } catch (err) {
        console.error(err)
    }
    console.log("Done!")
}

export function isLoggedIn(req, res, next) {
    if (req.user) return next();
    return res.status(403).send({ errors: ["You are not authenticated"] });
}
export function sendEmailVerification(userId, email, token) {
    //Create verification link containing user id and token
    const verificationLink = `${process.env.SERVER_URL}/verify/${userId}/${token}`;
    const htmlLink = `<a href="${verificationLink}">link</a>`;
    const messageOne = 'This is your email verification link:';
    const messageTwo = 'it will expire in 7 days';

    //Send verification email
    return sendgrid.sendMessage(
        email,
        "igor_motyka@mail.com",
        "Chat account verification",
        `${messageOne} ${verificationLink} ${messageTwo}`,
        `<p> ${messageOne} ${htmlLink} ${messageTwo} </p>`)

}
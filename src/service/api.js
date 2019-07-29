var cors = require("cors");
const MongoStore = require("connect-mongo")(session);
import multer from "multer";
import passport from "passport";
import bodyParser from "body-parser";
import { UserModel, getUserModelPublicInfo } from "../schemas/user";
import { InvitationModel } from "../schemas/invitation";
import { ConversationModel } from "../schemas/conversation";
import { MessageModel } from "../schemas/message";
import "../strategies/local_strategy";
import moment from "moment";
import uuidv4 from "uuid/v4";
import * as sendgrid from "./sendgrid_service";
import session from "express-session";


export const initializeApi = async (app, mongoose) => {
    console.log("Initializing API...")
    var corsOptions = {
        origin: function (origin, callback) {
            if (whitelist.indexOf(origin) !== -1 || !origin) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        }
    }

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
            cookie: { httpOnly: false, expires: new Date(moment().add(14, "days")) },
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

    await UserModel.createCollection();
    await ConversationModel.createCollection();
    await MessageModel.createCollection();
    await InvitationModel.createCollection();

    app.post('/login', (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) { return next(err); }
            if (!user) { return res.status(400).send(info); }
            req.logIn(user, function (err) {
                if (err) { return next(err); }
                let responce = {
                    user: user,
                    session: req.session
                }
                return res.status(200).send(responce)
            });
        })(req, res, next);
    });

    app.get("/logout", isLoggedIn, (req, res) => {
        req.logOut();
        res.status(200).send("Logout successfull");
    });

    app.get("/user", (req, res) => {
        if (req.user)
            return res.status(200).json(req.user)

        return res.status(400).json({ message: "You are not sign in" })
    });

    app.post("/user", async (req, res, next) => {
        const session = await mongoose.startSession();
        const opt = { session };
        try {
            session.startTransaction();

            let user = new UserModel(req.body);

            //Generate random guid
            const token = uuidv4();

            user.emailVerificationToken = token;
            user.emailVerificationSendDate = + Date.now();
            user.isEmailVerified = false;
            user.creationDate = + Date.now();
            user.expireAt = moment(Date.now()).add(7, "days").valueOf();

            //Save user here to get request data validation
            user = await user.save(opt);

            await sendEmailVerification(user._id, user.email, token)

            await session.commitTransaction();
            return res.status(201).send({ message: "User registered successfully" });

        } catch (err) {
            console.error(err);
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: err.message })
        }
    });

    app.patch("/user", isLoggedIn, async (req, res) => {
        if (req.isUnauthenticated())
            return res.status(403).send({
                message: "You are not authorized"
            });
        try {
            await UserModel.findOne({ _id: req.user._id }).exec();

            //swap properties
            Object.assign(user, req.body);

            const user = await user.save();

            return res.status(200).send(user);

        } catch (err) {
            console.error(err);
            return res.status(400).send(err)
        }
    });

    app.get("/users", async (req, res) => {
        try {
            const users = await UserModel.find({}, getUserModelPublicInfo()).populate(req.body.populate, getUserModelPublicInfo()).exec();
            return res.status(200).send(users);
        } catch (err) {
            console.error(err);
            return res.status(400).send({ message: err.message });
        }
    });

    app.get("/users/:id", async (req, res) => {
        try {
            const user = await UserModel.findOne({ _id: req.params.id }, getUserModelPublicInfo()).populate(req.body.populate, getUserModelPublicInfo()).exec();
            return res.status(200).send(user);
        } catch (err) {
            console.error(err)
            return res.status(400).send(err)
        }

    });

    app.get("/verify/:id/:token", async (req, res) => {
        var token = req.params.token;
        var userId = req.params.id;
        try {
            //Get user
            const user = await UserModel.findOne({ _id: userId }).exec();

            //Check if email is not already verified
            if (user.isEmailVerified)
                return res.status(400).send({ message: "Email is already verified" });

            //Check if verification date is not > 7 days
            if (moment(user.emailVerificationSendDate).diff(Date.now(), "days") > 7)
                return res.status(400).send({ message: "Verification link expired" });

            //Check if token match
            if (user.emailVerificationToken != token)
                return res.status(400).send({ message: "Invalid token" });

            user.isEmailVerified = true;
            user.expireAt = undefined;
            user.emailVerificationToken = undefined;
            user.emailVerificationSendDate = undefined;

            await user.save();
            return res.status(200).send("Email verified");

        } catch (err) {
            console.error(err)
            return res.status(400).send({ message: err.message });
        }

    });

    app.post("/resend", async (req, res) => {
        try {
            let userId = req.body.id;

            //Get user
            const user = await UserModel.findOne({ _id: userId }).exec();

            if (!user)
                res.status(400).send({ message: "No user with given id found" });

            //Check if email is not already verified
            if (user.isEmailVerified)
                return res.status(400).send({ message: "Email is already verified" });

            let token = uuidv4();

            await sendEmailVerification(userId, user.email, token)

            user.isEmailVerified = false;
            user.emailVerificationToken = token;
            user.emailVerificationSendDate = + new Date();

            await user.save();
            return res.status(200).send("Email verification send");

        } catch (err) {
            console.error(err)
            return res.status(400).send({ message: err.message });
        }

    });

    app.post("/user/invite", isLoggedIn, async (req, res) => {
        const session = await mongoose.startSession();
        const opt = { session };
        try {
            session.startTransaction();
            var userId = req.user._id;
            var targetId = req.body.targetId;

            //Check if user and target are not the same
            if (userId == targetId)
                return res.status(400).send({ message: "You cannot befreind yourself" });

            //Check if targetId is not already our friend
            for (const friendId of req.user.friends) {
                if (friendId == targetId)
                    return res.status(400).send({ message: "You are already friends" });
            }

            //Check if invitation already exists
            const results = await InvitationModel.find(
                {
                    $and: [{ sender: userId }, { target: targetId }]
                },
            ).exec();

            if (results.length > 0)
                return res.status(400).send({ message: "Invitation was already send" });

            const invitation = await new InvitationModel({
                date: + Date.now(),
                sender: userId,
                target: targetId
            }).save(opt);

            const invitedUser = await UserModel.findOne({ _id: targetId }).exec();

            //TODO: if not cast to string it will not compare well at accept invite level
            invitedUser.invitations.push(invitation._id);

            await invitedUser.save(opt);
            await session.commitTransaction();
            return res.status(200).send(invitation);

        } catch (err) {
            console.error(err);
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ message: err.message });
        }

    });

    app.get("/user/invite", isLoggedIn, async (req, res) => {
        try {
            const invites = await InvitationModel.find({ target: req.user._id }).populate(req.body.populate, getUserModelPublicInfo()).exec();
            return res.status(200).send(invites);
        } catch (err) {
            console.error(err);
            return res.status(400).send({ message: err.message });
        }
    });

    app.get("/user/invite/:id", isLoggedIn, async (req, res) => {
        try {
            const invite = await InvitationModel.findOne({ $and: [{ _id: req.params.id }, { target: req.user._id }] }).populate(req.body.populate, getUserModelPublicInfo()).exec();
            if (!invite)
                return res.status(200).send({ message: "No invitation found" });
            return res.status(200).send(invite);
        } catch (err) {
            console.error(err);
            return res.status(400).send({ message: err.message });
        }
    });

    app.get("/user/conversation", isLoggedIn, async (req, res) => {
        try {
            const conversations = await ConversationModel.find({ participants: req.user._id }).exec();
            return res.status(200).send(conversations);
        } catch (err) {
            console.error(err);
            return res.status(400).send({ message: err.message });
        }
    });

    app.get("/user/conversation/:id", isLoggedIn, async (req, res) => {
        try {
            const conversation = await ConversationModel.findOne({ $and: [{ _id: req.params.id }, { participants: req.user._id }] }).exec();

            return res.status(200).send(conversation);
        } catch (err) {
            console.error(err);
            return res.status(400).send({ message: err.message });
        }
    });

    app.get("/user/conversation/:id/message", isLoggedIn, async (req, res) => {
        let startDate = null;
        let endDate = null;
        const conversationId = req.params.id;

        if (req.body.startDate && req.body.endDate) {
            startDate = req.body.startDate;
            endDate = req.body.endDate;
        }

        try {
            const conversation = await ConversationModel.findOne({ $and: [{ _id: conversationId }, { participants: req.user._id }] }).exec();
            let messages = [];
            if (endDate)
                messages = await MessageModel.find({
                    $and: [{ _id: conversation.messages }, { sendDate: { $gte: startDate, $lte: endDate } }]
                }).populate('sender', getUserModelPublicInfo()).sort({ sendDate: 1 }).exec()
            else
                messages = await MessageModel.find({}).populate('sender', getUserModelPublicInfo()).exec()

            return res.status(200).send(messages);
        } catch (err) {
            console.error(err);
            return res.status(400).send({ message: err.message });
        }
    });

    app.post("/user/invite/accept", isLoggedIn, async (req, res) => {
        const session = await mongoose.startSession();
        const opt = { session };
        try {
            session.startTransaction();
            const invitation = await InvitationModel.findOne({ _id: req.body.id }).exec();

            //Check if user is target of this invitation
            if (req.user._id != invitation.target.toString())
                return res.status(400).send({
                    message:
                        "You are not target of this invitation so you cannot accept it. Nice try doe"
                });

            //find sender and add target to his friends list
            const invitationSender = await UserModel.findOne({ _id: invitation.sender }).exec();

            //Create conversation
            const conversation = await new ConversationModel({
                roomId: uuidv4(),
                participants: [req.user._id, invitationSender._id]
            }).save(opt);

            req.user.conversations.push(conversation._id)

            //Add invitation sender to user's friends list
            req.user.friends.push(invitation.sender);

            //Remove invitation from recived invitations list
            req.user.invitations = req.user.invitations.filter((item) => {
                return item.toString() != invitation._id.toString();
            });

            //Save target user
            await req.user.save(opt);

            //add to friend list
            invitationSender.friends.push(invitation.target);

            //add conversation
            invitationSender.conversations.push(conversation._id);

            //save changes
            await invitationSender.save(opt);

            //Remove invitation
            await invitation.remove(opt);

            await session.commitTransaction();
            return res.status(200).send({ message: "Invitation accepted" });

        } catch (err) {
            console.error(err);
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ message: err.message });
        }

    });

    app.post("/user/invite/reject", isLoggedIn, async (req, res) => {
        const session = await mongoose.startSession();
        const opt = { session };
        try {
            session.startTransaction();
            const invitation = await InvitationModel.findOne({ _id: req.body.id }).exec();

            if (!invitation)
                return res.status(400).send({ message: "No invitation found" })

            //Check if user is target of this invitation
            if (req.user._id != invitation.target.toString())
                return res.status(400).send({
                    message:
                        "You are not target of this invitation so you cannot reject it. Nice try doe"
                });

            //Remove invitation from recived invitations list
            req.user.invitations = req.user.invitations.filter((item) => {
                return item !== invitation._id;
            });

            //Save changes
            await req.user.save(opt);

            //Remove invitation
            await invitation.remove(opt);

            await session.commitTransaction();
            return res.status(200).send({ message: "Invitation rejected successfully" });

        } catch (err) {
            console.error(err);
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ message: err.message });
        }

    });

    console.log("Done!")
}

function isLoggedIn(req, res, next) {
    if (req.user) return next();
    return res.status(403).send({ message: "You are not authenticated" });
}
function sendEmailVerification(userId, email, token) {
    //Create verification link containing user id and token
    const verificationLink = `${process.env.SERVER_URL}/verify/${userId}/${token}`;
    console.log(`\n ${verificationLink} \n`);

    const htmlLink = `<a href="${verificationLink}">link</a>`;
    const messageOne = 'This is your email verification link:';
    const messageTwo = 'it will expire in 7 days';

    //Send verification email
    return sendgrid.sendMessage(
        email,
        "igor_motyka@mail.com",
        "Chat account verification",
        `${messageOne} ${verificationLink} ${messageTwo}`,
        `${messageOne} ${htmlLink} ${messageTwo}`)

}
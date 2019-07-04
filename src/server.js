var app = require("express")();
var cors = require("cors");
var server = require("http").Server(app);
import multer from "multer";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import bodyParser from "body-parser";
import { UserModel, getUserModelPublicInfo } from "./schemas/user";
import { InvitationModel } from "./schemas/invitation";
import "./local_strategy";
import moment from "moment";
const MongoStore = require("connect-mongo")(session);
import uuidv4 from "uuid/v4";
import * as sendgrid from "./service/sendgrid_service";
require("dotenv").config();
//TODO: Add mongo transactions
mongoose.connect(`${process.env.MONGO_SERVER_URL}/gymba`,
  { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true },
  err => {
    if (err) console.error(err);
  }
);
app.use(cors());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    //don't save session if unmodified
    resave: false,
    saveUninitialized: false,
    cookie: { expires: new Date(moment().add(14, "days")) },
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

app.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
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

app.get("/logout", isLoggedIn, function (req, res) {
  req.logOut();
  res.status(200).send("Logout successfull");
});

app.get("/user", function (req, res) {
  if (req.user)
    return res.status(400).send(req.user)


  return res.status(400).send({ message: "You are not sign in" })
});

app.post("/user", function (req, res) {
  var user = new UserModel(req.body);
  user.creationDate = Date.now();
  user.expireAt = moment(Date.now()).add(7, "days");

  //Save user here to get request data validation
  user.save(err => {
    console.log(err);

    if (err) return res.status(400).send(err);

    //Generate random guid
    var token = uuidv4();

    //Create verification link containing user id and token
    const verificationLink = `${process.env.SERVER_URL}/verify/${user._id}/${token}`;
    console.log(`\n ${verificationLink} \n`);

    //Send verification email
    sendgrid.sendMessage(
      user.email,
      "papilionem@noreply.com",
      "Chat account verification",
      `This is your email verification link: ${verificationLink} it will expire in 7 days`,
      `<a href="${verificationLink}">link</a>`,
      (err, results) => {
        if (err) return res.status(400).send(err);

        user.emailVerificationToken = token;
        user.emailVerificationSendDate = Date.now();
        user.isEmailVerified = false;
        user.save((err, user) => {
          if (err) return res.status(400).send(err);

          return res.status(201).send({ message: "User registered successfully" });
        });
      }
    );
  });
});

app.patch("/user", isLoggedIn, function (req, res) {
  if (req.isUnauthenticated())
    return res.status(403).send({
      message: "You are not authorized"
    });

  //user can only update information about himself
  // if (req.user._id != req.body.id)
  //   return res.status(403).send({
  //     message: "You are not authorized2"
  //   });

  UserModel.findOne({ _id: req.user._id }, (err, user) => {
    if (err) return res.status(403).send(err);

    //swap properties
    Object.assign(user, req.body);
    user.save(err => {
      if (err) return res.status(403).send(err);

      return res.status(200).send(user);
    });
  });
});

app.get("/users", function (req, res) {
  UserModel.find({}, getUserModelPublicInfo(), (err, users) => {
    if (err) return res.status(400).send(err)

    return res.status(200).send(users);
  })
});

app.get("/users/:id", function (req, res) {
  UserModel.findOne({ _id: req.params.id }, getUserModelPublicInfo(), (err, user) => {
    if (err) return res.status(400).send(err)

    return res.status(200).send(user);
  })
});

app.get("/verify/:id/:token", function (req, res) {
  var token = req.params.token;
  var userId = req.params.id;

  //Get user
  UserModel.findOne({ _id: userId }, (err, user) => {
    if (err) return res.status(400).send(err);

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

    user.save(err => {
      if (err) return res.status(500).send(err);

      return res.status(200).redirect("/login");
    });
  });
});

app.post("/invite", isLoggedIn, function (req, res) {
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
  InvitationModel.find(
    {
      $and: [{ senderId: userId }, { targetId: targetId }]
    },
    (err, results) => {
      if (err) return res.status(400).send(err);

      if (results.length > 0)
        return res.status(400).send({ message: "Invitation was already send" });

      UserModel.findOne({ _id: targetId }, (err, invitedUser) => {
        if (err) return res.status(400).send(err);

        var invitation = new InvitationModel({
          date: Date.now(),
          senderId: userId,
          targetId: targetId
        });

        invitation.save((err, invite) => {
          if (err) return res.status(400).send(err);

          //TODO: if not cast to string it will not compare well at accept invite level
          invitedUser.invitations.push(invite._id.toString());

          invitedUser.save((err, user) => {
            if (err) return res.status(400).send(err);
            return res.status(200).send(invite);
          });
        });
      });
    }
  );
});

app.get("/invite", isLoggedIn, function (req, res) {
  InvitationModel.find((err, results) => {
    if (err) return res.status(400).send(err);

    return res.status(200).send(results);
  });
});

app.get("/invite/:id", isLoggedIn, function (req, res) {
  InvitationModel.findOne({ _id: req.params.id }, (err, results) => {
    if (err) return res.status(400).send(err);

    return res.status(200).send(results);
  });
});

app.post("/invite/accept", isLoggedIn, function (req, res) {
  InvitationModel.findOne({ _id: req.params.id }, (err, invitation) => {
    if (err) return res.status(400).send(err);

    //Check if user is target of this invitation
    if (req.user._id != invitation.targetId)
      return res.status(400).send({
        message:
          "You are not target of this invitation so you cannot accept it. Nice try doe"
      });

    //Add invitation sender to user's friends list
    req.user.friends.push(invitation.senderId);

    console.log(req.user);
    //Remove invitation from recived invitations list
    req.user.invitations = req.user.invitations.filter(function (item) {
      return item != invitation._id;
    });
    console.log(req.user);

    //Save target user
    req.user.save(err => {
      if (err) return res.status(400).send(err);

      //find sender and add target to his friends list
      UserModel.findOne({ _id: invitation.senderId }, (err, invitationSender) => {
        if (err) return res.status(400).send(err);

        //add to friend list
        invitationSender.friends.push(invitation.targetId);

        //save changes
        invitationSender.save(err => {
          if (err) return res.status(400).send(err);

          //Remove invitation
          invitation.remove(err => {
            if (err) return res.status(400).send(err);

            return res.status(200).send({ message: "Invitation accepted" });
          });
        });
      });
    });
  });
});

app.post("/invite/reject", isLoggedIn, function (req, res) {
  InvitationModel.findOne({ _id: req.params.id }, (err, invitation) => {
    if (err) return res.status(400).send(err);

    //Check if user is target of this invitation
    if (req.user._id != invitation.targetId)
      return res.status(400).send({
        message:
          "You are not target of this invitation so you cannot reject it. Nice try doe"
      });

    //Remove invitation from recived invitations list
    req.user.invitations = req.user.invitations.filter(function (item) {
      return item != invitation._id;
    });

    //Save changes
    req.user.save(err => {
      if (err) return res.status(400).send(err);

      //Remove invitation
      invitation.remove(err => {
        if (err) return res.status(400).send(err);

        return res.status(200).send({ message: "Invitation rejected successfully" });
      });
    });
  });
});

function isLoggedIn(req, res, next) {
  if (req.user) return next();

  return res.status(403).send({ message: "You are not authenticated" });
}

server.listen(8000);
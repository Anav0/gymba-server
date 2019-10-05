import { isLoggedIn } from "./index";
import passport from "passport";
import express from "express";
import { UserModel } from "../schemas"
import moment from "moment"
import settings from "../settings"
const router = express.Router();
import uuidv4 from "uuid/v4";
import { sendEmailVerification } from "../api";

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
        if (error) { return next(error); }
        if (!user) { return res.status(400).json(info); }
        req.logIn(user, (error) => {
            if (error) { return next(error); }
            let responce = {
                user: user,
                session: req.session
            }
            return res.status(200).json(responce)
        });
    })(req, res, next);
});

router.get("/logout", isLoggedIn, (req, res) => {
    req.logOut();
    res.status(200).send("Logout successfull");
});

router.get("/verify/:id/:token", async (req, res, next) => {
    try {
        const token = req.params.token;
        const userId = req.params.id;

        //Get user
        const user = await UserModel.findOne({ _id: userId }).exec();

        //Check if email is not already verified
        if (user.isEmailVerified)
            throw new Error('Email is already verified')

        //Check if verification date is not > 7 days
        if (moment(user.emailVerificationSendDate).diff(Date.now(), settings.validationEmail.unit) > settings.validationEmail.validFor)
            throw new Error('Verification link expired')

        //Check if token match
        if (user.emailVerificationToken != token)
            throw new Error('Invalid token')

        user.isEmailVerified = true;
        user.expireAt = undefined;
        user.emailVerificationToken = undefined;
        user.emailVerificationSendDate = undefined;

        await user.save();
        return res.status(200).send("Email verified");

    } catch (error) {
        console.error(error)
        next(error)
    }

});

router.post("/resend-email", async (req, res, next) => {
    try {
        const userId = req.body.id;

        //Get user
        const user = await UserModel.findOne({ _id: userId }).exec();

        if (!user)
            throw new Error("No user with given id found")

        //Check if email is not already verified
        if (user.isEmailVerified)
            throw new Error('Email is already verified')

        if (user.emailVerificationSendDate) {
            let diff = moment().diff(moment(user.emailVerificationSendDate), settings.validationEmailResend.unit);
            if (diff < settings.validationEmailResend.validFor)
                throw new Error(`You can request resend after waiting ${settings.validationEmailResend.validFor} ${settings.validationEmailResend.unit}`)
        }

        let token = uuidv4();

        await sendEmailVerification(userId, user.email, token)

        user.isEmailVerified = false;
        user.emailVerificationToken = token;
        user.emailVerificationSendDate = + new Date();

        await user.save();
        return res.status(200).send("Email verification send");

    } catch (error) {
        console.error(error)
        next(error)
    }

});

router.post("/resend-email/:email", async (req, res, next) => {
    try {
        const email = req.params.email;

        //Get user
        const user = await UserModel.findOne({ email: email }).exec();

        if (!user)
            throw new Error("No user with given email found")

        //Check if email is not already verified
        if (user.isEmailVerified)
            throw new Error('Email is already verified')

        if (user.emailVerificationSendDate) {
            let diff = moment().diff(moment(user.emailVerificationSendDate), settings.validationEmailResend.unit);
            if (diff < settings.validationEmailResend.validFor)
                throw new Error(`You can request resend after waiting ${settings.validationEmailResend.validFor} ${settings.validationEmailResend.unit}`)
        }

        let token = uuidv4();

        await sendEmailVerification(user._id, user.email, token)

        user.isEmailVerified = false;
        user.emailVerificationToken = token;
        user.emailVerificationSendDate = + new Date();

        await user.save();
        return res.status(200).send("Email verification send");

    } catch (error) {
        console.error(error)
        next(error)
    }

});

export default router;
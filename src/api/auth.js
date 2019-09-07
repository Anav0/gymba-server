import { isLoggedIn } from "./index";
import passport from "passport";
import express from "express";
const router = express.Router();

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) { return res.status(400).send(info); }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            let responce = {
                user: user,
                session: req.session
            }
            return res.status(200).send(responce)
        });
    })(req, res, next);
});

router.get("/logout", isLoggedIn, (req, res) => {
    req.logOut();
    res.status(200).send("Logout successfull");
});

router.get("/verify/:id/:token", async (req, res) => {
    var token = req.params.token;
    var userId = req.params.id;
    try {
        //Get user
        const user = await UserModel.findOne({ _id: userId }).exec();

        //Check if email is not already verified
        if (user.isEmailVerified)
            return res.status(400).send({ errors: ["Email is already verified"] });

        //Check if verification date is not > 7 days
        if (moment(user.emailVerificationSendDate).diff(Date.now(), settings.validationEmail.unit) > settings.validationEmail.validFor)
            return res.status(400).send({ errors: ["Verification link expired"] });

        //Check if token match
        if (user.emailVerificationToken != token)
            return res.status(400).send({ errors: ["Invalid token"] });

        user.isEmailVerified = true;
        user.expireAt = undefined;
        user.emailVerificationToken = undefined;
        user.emailVerificationSendDate = undefined;

        await user.save();
        return res.status(200).send("Email verified");

    } catch (err) {
        console.error(err)
        return res.status(400).send(err);
    }

});

router.post("/resend-email", async (req, res) => {
    try {
        let userId = req.body.id;

        //Get user
        const user = await UserModel.findOne({ _id: userId }).exec();

        if (!user)
            res.status(400).send({ errors: ["No user with given id found"] });

        //Check if email is not already verified
        if (user.isEmailVerified)
            return res.status(400).send({ errors: ["Email is already verified"] });

        if (user.emailVerificationSendDate) {
            let diff = moment().diff(moment(user.emailVerificationSendDate), settings.validationEmailResend.unit);
            if (diff < settings.validationEmailResend.validFor)
                return res.status(400).send({ errors: [`You requested resend ${diff} minutes ago. Try again after ${settings.validationEmailResend.validFor} minutes`] });
        }

        let token = uuidv4();

        await sendEmailVerification(userId, user.email, token)

        user.isEmailVerified = false;
        user.emailVerificationToken = token;
        user.emailVerificationSendDate = + new Date();

        await user.save();
        return res.status(200).send("Email verification send");

    } catch (err) {
        console.error(err)
        return res.status(400).send(err);
    }

});

export default router;
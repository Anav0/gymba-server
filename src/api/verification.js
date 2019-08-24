import { UserModel } from "../schemas";
import moment from "moment";
import settings from "../settings";
import uuidv4 from "uuid/v4";
import { sendEmailVerification } from "../api"

export const setupVerificationEndpoints = (app, mongoose) => {

    app.get("/verify/:id/:token", async (req, res) => {
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

    app.post("/resend-verification-email", async (req, res) => {
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
}
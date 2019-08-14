import uuidv4 from "uuid/v4";
import settings from "../settings";
import moment from "moment";
import { UserModel } from "../schemas";
import { sendEmailVerification, isLoggedIn } from "../api"

export const setupUserEndpoints = (app, mongoose) => {

    app.get("/user", (req, res) => {
        if (req.user)
            return res.status(200).json(req.user)

        return res.status(400).json({ errors: ["You are not sign in"] })
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
            user.expireAt = moment(Date.now()).add(settings.user.validFor, settings.user.unit).valueOf();

            //Save user here to get request data validation
            user = await user.save(opt);

            await sendEmailVerification(user._id, user.email, token)

            await session.commitTransaction();
            return res.status(201).send(user);

        } catch (err) {
            console.error(err);
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json(err)
        }
    });

    app.patch("/user", isLoggedIn, async (req, res) => {
        if (req.isUnauthenticated())
            return res.status(403).send({
                errors: ["You are not authorized"]
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
}
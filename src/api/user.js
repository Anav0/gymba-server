import uuidv4 from "uuid/v4";
import settings from "../settings";
import moment from "moment";
import { UserModel, getUserModelPublicInfo, InvitationModel } from "../schemas";
import { sendEmailVerification, isLoggedIn } from "../api"
import express from 'express';
import mongoose from "mongoose";
const router = express.Router();

router.get("/", async (req, res, next) => {
    if (req.user) {
        try {
            return res.status(200).json(req.user)
        } catch (error) {
            next(error)
        }
    }
    throw Error('You are not authenticated');
});

router.post("/", async (req, res, next) => {
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
        return res.status(201).json(user);

    } catch (error) {
        console.error(error);
        await session.abortTransaction();
        session.endSession();
        next(error)
    }
});

router.patch("/", isLoggedIn, async (req, res, next) => {
    try {

        //swap properties
        Object.assign(req.user, req.body);

        const user = await req.user.save();

        return res.status(200).json(req.user);

    } catch (error) {
        console.error(error);
        next(error)
    }
});

router.post("/remove-friend", isLoggedIn, async (req, res) => {
    const session = await mongoose.startSession();
    const opt = { session };
    try {
        session.startTransaction();
        const friend = await UserModel.findById(req.body.id).exec();

        if (!friend)
            return res.status(400).json({ errors: ['No user with given id found'] })

        req.user.friends = req.user.friends.filter(id => id.toString() != friend._id.toString())
        await req.user.save(opt)

        friend.friends = friend.friends.filter(id => id.toString() != req.user._id.toString())
        await friend.save(opt)

        session.commitTransaction();
        return res.status(200).json(`${friend.fullname} is no longer your friend`)

    } catch (error) {
        console.error(error)
        await session.abortTransaction();
        session.endSession();
        next(error)
    }

});

router.get("/suggested-friends", isLoggedIn, async (req, res) => {
    try {
        const invitations = await InvitationModel.find({ $or: [{ sender: req.user._id }, { target: req.user._id }] }).exec();
        let ids = invitations.map(invite => invite.target)
        ids.push(...invitations.map(invite => invite.sender))
        const users = await UserModel.find({ $and: [{ _id: { $ne: req.user._id } }, { _id: { $nin: ids } }, { _id: { $nin: req.user.friends } }] }, getUserModelPublicInfo()).exec();
        return res.status(200).json(users);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

//TODO: Add endpoint that will return user's favorite contacts

export default router;
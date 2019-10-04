import { isLoggedIn } from "./index";
import { InvitationModel, ConversationModel, UserModel, getUserModelPublicInfo } from "../schemas";
import uuidv4 from "uuid/v4";
import express from 'express';
import mongoose from "mongoose";
const router = express.Router();

router.post("/", isLoggedIn, async (req, res, next) => {
    const session = await mongoose.startSession();
    const opt = { session };
    try {
        session.startTransaction();
        var userId = req.user._id;
        var targetId = req.body.targetId;

        //Check if user and target are not the same
        if (userId == targetId)
            throw new Error('You cannot befriend yourself')

        //Check if targetId is not already our friend
        for (const friendId of req.user.friends) {
            if (friendId == targetId)
                throw new Error('You are already friends')
        }

        //Check if invitation already exists
        const results = await InvitationModel.find(
            {
                $or: [{ $and: [{ sender: userId }, { target: targetId }] }, { $and: [{ sender: targetId }, { target: userId }] }]
            },
        ).exec();

        if (results.length > 0)
            throw new Error('Invitation was already send')

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
        return res.status(200).json(invitation);

    } catch (error) {
        console.error(error);
        await session.abortTransaction();
        session.endSession();
        next(error)
    }

});

router.get("/:populate?", isLoggedIn, async (req, res, next) => {
    try {
        const invites = await InvitationModel.find({ sender: req.user._id }).populate(!req.params.populate ? '' : req.params.populate, getUserModelPublicInfo()).exec();
        return res.status(200).json(invites);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

router.get("/:id", isLoggedIn, async (req, res, next) => {
    try {
        const invite = await InvitationModel.findOne({ $and: [{ _id: req.params.id }, { target: req.user._id }] }).populate(!req.params.populate ? '' : req.params.populate, getUserModelPublicInfo()).exec();
        if (!invite)
            return res.status(200).json({ errors: ["No invitation found"] });
        return res.status(200).json(invite);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

router.get("/involves/:userId?", isLoggedIn, async (req, res, next) => {
    try {
        let invites = await InvitationModel.find({ $and: [{ sender: req.params.userId }, { target: req.user._id }] }).populate(!req.params.populate ? '' : req.params.populate, getUserModelPublicInfo()).exec();
        invites.push(...await InvitationModel.find({ $and: [{ sender: req.user._id }, { target: req.params.userId }] }).populate(!req.params.populate ? '' : req.params.populate, getUserModelPublicInfo()).exec());
        if (!invites)
            return res.status(200).json({ errors: ["No invitations found"] });
        return res.status(200).json(invites ? invites[0] : {});
    } catch (error) {
        console.error(error);
        next(error)
    }
});

router.post("/accept", isLoggedIn, async (req, res, next) => {
    const session = await mongoose.startSession();
    const opt = { session };
    try {
        session.startTransaction();
        const invitation = await InvitationModel.findOne({ _id: req.body.id }).exec();

        if (!invitation)
            throw new Error('No invitation found');

        //Check if user is target of this invitation
        if (req.user._id != invitation.target.toString())
            throw new Error('You are not target of this invitation so you cannot accept it. Nice try doe')

        //find sender and add target to his friends list
        const invitationSender = await UserModel.findOne({ _id: invitation.sender }).exec();

        if (!invitationSender)
            throw new Error('Sender no longer exists')

        //Check if users spoke before
        let conversation = [];
        req.user.conversations.map(id => {
            if (invitationSender.conversations.includes(id))
                return conversation.push(id);
        })
        conversation = conversation[0];
        if (!conversation)
            //Create conversation
            conversation = await new ConversationModel({
                roomId: uuidv4(),
                participants: [req.user._id, invitationSender._id]
            }).save(opt);

        //add conversation
        req.user.conversations.push(conversation._id)
        invitationSender.conversations.push(conversation._id);

        //Add invitation sender to user's friends list
        req.user.friends.push(invitation.sender);

        //add to friend list
        invitationSender.friends.push(invitation.target);

        //Save target user
        await req.user.save(opt);

        //save changes
        await invitationSender.save(opt);

        //Remove invitation
        await invitation.remove(opt);

        await session.commitTransaction();
        return res.status(200).json("Invitation accepted");

    } catch (error) {
        console.error(error);
        await session.abortTransaction();
        session.endSession();
        next(error)
    }

});

router.post("/reject", isLoggedIn, async (req, res, next) => {
    //TODO: think about making transaction middleware
    const session = await mongoose.startSession();
    const opt = { session };
    try {
        session.startTransaction();
        const invitation = await InvitationModel.findOne({ _id: req.body.id }).exec();

        if (!invitation)
            throw new Error('No invitation found')

        //Check if user is target or sender of this invitation
        if (req.user._id.toString() != invitation.target.toString() && req.user._id.toString() != invitation.sender.toString())
            throw new Error('You are not a target nor sender of this invitation so you cannot reject it. Nice try doe')

        //Remove invitation
        //TODO: remove() should cascade then any relaction to object will be removed as well
        await invitation.remove(opt);

        await session.commitTransaction();

        //TODO: thing about i18n, maybe passing lang param will do the trick
        return res.status(200).send("Invitation rejected successfully");

    } catch (error) {
        console.error(error);
        await session.abortTransaction();
        session.endSession();
        next(error)
    }

});

router.get("/recived/:populate?", isLoggedIn, async (req, res) => {
    try {
        const invites = await InvitationModel.find({ target: req.user._id }).populate(!req.params.populate ? '' : req.params.populate, getUserModelPublicInfo()).exec();
        return res.status(200).json(invites);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

export default router;
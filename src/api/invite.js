import { isLoggedIn } from "./index";
import { InvitationModel, ConversationModel, UserModel, getUserModelPublicInfo } from "../schemas";
import uuidv4 from "uuid/v4";
import express from 'express';
const router = express.Router();

router.post("/", isLoggedIn, async (req, res) => {
    const session = await mongoose.startSession();
    const opt = { session };
    try {
        session.startTransaction();
        var userId = req.user._id;
        var targetId = req.body.targetId;

        //Check if user and target are not the same
        if (userId == targetId)
            return res.status(400).send({ errors: ["You cannot befriend yourself"] });

        //Check if targetId is not already our friend
        for (const friendId of req.user.friends) {
            if (friendId == targetId)
                return res.status(400).send({ errors: ["You are already friends"] });
        }

        //Check if invitation already exists
        const results = await InvitationModel.find(
            {
                $and: [{ sender: userId }, { target: targetId }]
            },
        ).exec();

        if (results.length > 0)
            return res.status(400).send({ errors: ["Invitation was already send"] });

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

    } catch (error) {
        console.error(error);
        await session.abortTransaction();
        session.endSession();
        return res.status(400).send(error);
    }

});

router.get("/:populate?", isLoggedIn, async (req, res) => {
    try {
        const invites = await InvitationModel.find({ sender: req.user._id }).populate(!req.params.populate ? '' : req.params.populate, getUserModelPublicInfo()).exec();
        return res.status(200).send(invites);
    } catch (error) {
        console.error(error);
        return res.status(400).send(error);
    }
});

router.get("/:id", isLoggedIn, async (req, res) => {
    try {
        const invite = await InvitationModel.findOne({ $and: [{ _id: req.params.id }, { target: req.user._id }] }).populate(!req.params.populate ? '' : req.params.populate, getUserModelPublicInfo()).exec();
        if (!invite)
            return res.status(200).send({ errors: ["No invitation found"] });
        return res.status(200).send(invite);
    } catch (error) {
        console.error(error);
        return res.status(400).send(error);
    }
});

router.post("/accept", isLoggedIn, async (req, res) => {
    const session = await mongoose.startSession();
    const opt = { session };
    try {
        session.startTransaction();
        const invitation = await InvitationModel.findOne({ _id: req.body.id }).exec();

        if (!invitation)
            return res.status(400).send({
                errors:
                    ["No invitation found"]
            });

        //Check if user is target of this invitation
        if (req.user._id != invitation.target.toString())
            return res.status(400).send({
                errors:
                    ["You are not target of this invitation so you cannot accept it. Nice try doe"]
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
        return res.status(200).send({ errors: ["Invitation accepted"] });

    } catch (error) {
        console.error(error);
        await session.abortTransaction();
        session.endSession();
        return res.status(400).send(error);
    }

});

router.post("/reject", isLoggedIn, async (req, res) => {
    //TODO: think about making transaction middleware
    const session = await mongoose.startSession();
    const opt = { session };
    try {
        session.startTransaction();
        const invitation = await InvitationModel.findOne({ _id: req.body.id }).exec();

        if (!invitation)
            return res.status(400).send({ errors: ["No invitation found"] })

        //Check if user is target of this invitation
        if (req.user._id.toString() != invitation.target.toString())
            return res.status(400).send({
                errors: [
                    "You are not target of this invitation so you cannot reject it. Nice try doe"]
            });

        //Remove invitation from recived invitations list
        req.user.invitations = req.user.invitations.filter((id) => {
            return id.toString() != invitation._id.toString();
        });

        //Save changes
        await req.user.save(opt);

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
        return res.status(400).send(error);
    }

});

router.post("/cancel", isLoggedIn, async (req, res) => {
    const session = await mongoose.startSession();
    const opt = { session };
    try {
        session.startTransaction();
        const invitation = await InvitationModel.findOne({ _id: req.body.id }).exec();

        if (!invitation)
            return res.status(400).send({ errors: ["No invitation found"] })

        //Check if user is sender of this invitation
        if (req.user._id != invitation.sender.toString())
            return res.status(400).send({
                errors: [
                    "You are not sender of this invitation so you cannot cancel it. Nice try doe"]
            });

        const target = await UserModel.findById(invitation.target).select('+invitations').exec();

        //Remove invitation from recived invitations list
        target.invitations = target.invitations.filter((id) => {
            return id.toString() != invitation._id.toString();
        });

        //Save changes
        await target.save(opt);

        //Remove invitation
        await invitation.remove(opt);

        await session.commitTransaction();
        return res.status(200).send("Invitation cancel successfully");

    } catch (error) {
        console.error(error);
        await session.abortTransaction();
        session.endSession();
        return res.status(400).send(error);
    }

});

router.get("/recived/:populate?", isLoggedIn, async (req, res) => {
    try {
        const invites = await InvitationModel.find({ target: req.user._id }).populate(!req.params.populate ? '' : req.params.populate, getUserModelPublicInfo()).exec();
        return res.status(200).send(invites);
    } catch (error) {
        console.error(error);
        return res.status(400).send(error);
    }
});

export default router;
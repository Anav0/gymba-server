import { isLoggedIn } from "./index";
import { ConversationModel, MessageModel, getUserModelPublicInfo, } from "../schemas";
import express from "express";
const router = express.Router();

router.get("/", isLoggedIn, async (req, res) => {
    try {
        const conversations = await ConversationModel.find({ participants: req.user._id }).exec();
        return res.status(200).send(conversations);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

router.get("/last-active", isLoggedIn, async (req, res, next) => {
    try {
        const mostRecentMessage = await MessageModel.findOne({ conversationId: { $in: req.user.conversations } }).sort({ sendDate: -1 }).limit(1)
        if (!mostRecentMessage)
            return res.status(200).json({});
        const conversations = await ConversationModel.find({ messages: mostRecentMessage._id }).populate('participants', getUserModelPublicInfo()).exec();
        if (conversations.length > 0)
            return res.status(200).json(conversations[0]);
        else res.status(200).json({});
    } catch (error) {
        next(error)
    }
});

router.get("/participant/:partId/:numberOfPart?", isLoggedIn, async (req, res, next) => {
    try {
        let conversations = []
        if (req.params.numberOfPart)
            conversations = await ConversationModel.find({ $and: [{ participants: req.user._id }, { participants: req.params.partId }, { participants: { $size: req.params.numberOfPart } }] }).exec();
        else conversations = await ConversationModel.find({ $and: [{ participants: req.user._id }, { participants: req.params.partId }] }).exec();
        return res.status(200).json(conversations);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

router.get("/:id", isLoggedIn, async (req, res, next) => {
    try {
        const conversation = await ConversationModel.findOne({ $and: [{ _id: req.params.id }, { participants: req.user._id }] }).populate('participants', getUserModelPublicInfo()).exec();
        return res.status(200).json(conversation);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

router.get("/:id/messages", isLoggedIn, async (req, res, next) => {
    let startDate = new Date();
    let endDate = null;
    const conversationId = req.params.id;

    if (!conversationId)
        throw new Error('There is no conversation id provided')

    if (req.body.startDate && req.body.endDate) {
        startDate = req.body.startDate;
        endDate = req.body.endDate;
    }

    try {
        const conversation = await ConversationModel.findOne({ $and: [{ _id: conversationId }, { participants: req.user._id }] }).exec();
        if (!conversation)
            throw new Error('No conversation with given id found')
        let messages = [];
        if (endDate)
            messages = await MessageModel.find({
                $and: [{ _id: { $in: conversation.messages } }, { sendDate: { $gte: startDate, $lte: endDate } }]
            }).populate('sender', getUserModelPublicInfo()).sort({ sendDate: 1 }).exec()
        else
            messages = await MessageModel.find({
                _id: { $in: conversation.messages }
            }).populate('sender', getUserModelPublicInfo()).sort({ sendDate: 1 }).exec()

        return res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

router.get("/:id/unread", isLoggedIn, async (req, res, next) => {
    const conversationId = req.params.id;
    try {
        const conversation = await ConversationModel.findById(conversationId).exec();
        if (!conversation)
            throw new Error("No conversation with given id found");

        const unreadMessages = await MessageModel.find({ $and: [{ status: "send" }, { sender: { $ne: req.user._id }, _id: { $in: conversation.messages } }] }).sort({ sendDate: 1 }).exec();
        return res.status(200).json(unreadMessages);
    }
    catch (error) {
        next(error);
    }
});

export default router
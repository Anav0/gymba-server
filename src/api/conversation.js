import { isLoggedIn } from "./index";
import { ConversationModel, MessageModel, getUserModelPublicInfo, } from "../schemas";

export const setupConversationEndpoints = (app) => {
    app.get("/user/conversation", isLoggedIn, async (req, res) => {
        try {
            const conversations = await ConversationModel.find({ participants: req.user._id }).exec();
            return res.status(200).send(conversations);
        } catch (err) {
            console.error(err);
            return res.status(400).send(err);
        }
    });

    app.get("/user/conversation/:id", isLoggedIn, async (req, res) => {
        try {
            const conversation = await ConversationModel.findOne({ $and: [{ _id: req.params.id }, { participants: req.user._id }] }).exec();

            return res.status(200).send(conversation);
        } catch (err) {
            console.error(err);
            return res.status(400).send(err);
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
            return res.status(400).send(err);
        }
    });
}
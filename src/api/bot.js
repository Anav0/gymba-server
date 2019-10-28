import {getBotModelPublicInfo, BotModel} from "../schemas";
import express from 'express';

const router = express.Router();
import axios from "axios";
import {isLoggedIn} from "./index";

router.get("/", isLoggedIn, async (req, res, next) => {
    try {
        const bots = await BotModel.find({}, getBotModelPublicInfo()).exec();
        return res.status(200).json(bots);
    } catch (error) {
        next(error)
    }
});

router.get("/:id", isLoggedIn, async (req, res, next) => {
    try {
        if (!req.params.id)
            throw new Error('No id provided');
        const bot = await BotModel.findById(req.params.id, getBotModelPublicInfo()).exec();
        return res.status(200).json(bot);
    } catch (error) {
        next(error)
    }
});

router.post("/message/", isLoggedIn, async (req, res, next) => {
    try {
        if (!req.body.message.trim())
            throw new Error('Message is not specified');
        if (!req.body.botName)
            throw new Error('No bot name or message provided');
        const bot = await BotModel.findOne({botName: req.body.botName}, getBotModelPublicInfo()).exec();
        if (!bot)
            throw new Error('No bot with given name found');
        try {
            const response = await axios.get(`${process.env.BOT_URL}?message=${req.body.message}&name=${req.body.botName}`);
            return res.status(200).json({message: response.data});
        } catch (error) {
            throw new Error('Cannot reach chat bot, try again');
        }
    } catch (error) {
        next(error)
    }
});

export default router;

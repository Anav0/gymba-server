import express from "express";
const router = express.Router();
import { MessageModel } from "../schemas";
import { isLoggedIn } from ".";

router.patch("/", isLoggedIn, async (req, res, next) => {
    try {
        if (!req.body._id)
            throw new Error('No message to update was send')

        if (!req.body.status)
            throw new Error('No status send')

        let message = await MessageModel.findById(req.body._id).exec();

        if (message.sender.toString() != req.user._id.toString())
            throw new Error('Only sender of an message can update its status')

        message.status = req.body.status;

        await message.save();
        return res.status(200).json(message);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

export default router;
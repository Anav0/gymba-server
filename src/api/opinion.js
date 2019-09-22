import express from "express";
const router = express.Router();
import { sendMessage } from '../service/sendgrid';

router.post("/", async (req, res, next) => {
    try {
        if (!req.body.sender || !req.body.content)
            throw new Error('No sender or content provided')

        await sendMessage(process.env.MY_EMAIL, req.body.sender, 'Gymba opinion', req.body.content)
        return res.status(200).send('Opinion send successfully');
    } catch (error) {
        console.error(error);
        next(error)
    }
});

export default router;
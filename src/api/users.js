import { UserModel, getUserModelPublicInfo, } from "../schemas";
import express from 'express';

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const users = await UserModel.find({}, getUserModelPublicInfo()).populate(req.body.populate, getUserModelPublicInfo()).exec();
        return res.status(200).send(users);
    } catch (error) {
        console.error(error);
        return res.status(400).send(error);
    }
});

router.get("/:id", async (req, res) => {
    try {
        const user = await UserModel.findOne({ _id: req.params.id }, getUserModelPublicInfo()).exec();
        return res.status(200).send(user);
    } catch (error) {
        console.error(error)
        return res.status(400).send(error)
    }

});

export default router;
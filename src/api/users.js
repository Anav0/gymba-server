import { UserModel, getUserModelPublicInfo, } from "../schemas";
import express from 'express';

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const users = await UserModel.find({}, getUserModelPublicInfo()).populate(req.body.populate, getUserModelPublicInfo()).exec();
        return res.status(200).json(users);
    } catch (error) {
        console.error(error);
        next(error)
    }
});

router.get("/:id", async (req, res) => {
    try {
        const user = await UserModel.findOne({ _id: req.params.id }, getUserModelPublicInfo()).exec();
        return res.status(200).json(user);
    } catch (error) {
        console.error(error)
        return res.status(400).json(error)
    }

});

export default router;
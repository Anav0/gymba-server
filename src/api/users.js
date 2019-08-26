import { UserModel, getUserModelPublicInfo, } from "../schemas";

export const setupUsersEndpoints = (app, mongoose) => {

    app.get("/users", async (req, res) => {
        try {
            const users = await UserModel.find({}, getUserModelPublicInfo()).populate(req.body.populate, getUserModelPublicInfo()).exec();
            return res.status(200).send(users);
        } catch (err) {
            console.error(err);
            return res.status(400).send(err);
        }
    });

    app.get("/users/:id", async (req, res) => {
        try {
            const user = await UserModel.findOne({ _id: req.params.id }, getUserModelPublicInfo()).exec();
            return res.status(200).send(user);
        } catch (err) {
            console.error(err)
            return res.status(400).send(err)
        }

    });
}
import { Router } from "express";
import { UserService } from "../service/userService";
import { BotService } from "../service/botService";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    let users = await new UserService().getUsers();
    users.push(...(await new BotService().getAll()));
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    let user = await new UserService().getById(req.params.id);
    if (!user) user = await new BotService().getById(req.params.id);
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

export default router;

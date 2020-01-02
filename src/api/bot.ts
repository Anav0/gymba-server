import { Router } from "express";
const router = Router();
import { isLoggedIn } from "./index";
import { BotService } from "../service/botService";
import { TransactionRunner } from "../service/transactionRunner";
import { UserService } from "../service/userService";
import { ConversationService } from "../service/conversationService";
import uuidv4 from "uuid";

router.get(
  "/",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const bots = await new BotService().getAll();
      return res.status(200).json(bots);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      if (!req.params.id) throw new Error("No id provided");
      const bot = await new BotService().getById(req.params.id);
      return res.status(200).json(bot);
    } catch (error) {
      next(error);
    }
  }
);

router.post("/", async (req, res, next) => {
  const runner = new TransactionRunner();
  const opt = await runner.startSession();
  try {
    runner.startTransaction();
    if (req.body.password != process.env.BOT_CREATION_PASS)
      throw new Error("Incorrect password");
    const botService = new BotService();
    const userService = new UserService();

    let bot = await botService.create(req.body.bot, opt);
    const users = await userService.getUsers(true, opt.session);

    for (let i = 0; i < users.length; i++) {
      let user = users[i];
      let conversation = await new ConversationService().createConversation(
        {
          roomId: uuidv4(),
          participants: [user._id, bot._id]
        },
        opt
      );

      user.conversations.push(conversation._id);
      bot.conversations.push(conversation._id);

      user.friends.push(bot._id);
      bot.friends.push(user._id);

      await userService.update(user._id, user, opt);
    }
    bot = await botService.update(bot._id, bot, opt);

    await runner.commitTransaction();
    return res.status(201).json(bot);
  } catch (error) {
    console.error(error);
    await runner.abortTransaction();
    await runner.endSession();
    next(error);
  }
});

export default router;

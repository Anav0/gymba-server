import { Router } from "express";
const router = Router();
import { isLoggedIn } from "./index";
import { BotService } from "../service/botService";

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

export default router;

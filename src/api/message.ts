import { Router } from "express";
const router = Router();
import { IUser, MessageStatus } from "../models";
import { isLoggedIn } from ".";
import { ConversationService } from "../service/conversationService";

router.patch(
  "/",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      if (!req.body.id) throw new Error("No id of message to update was send");

      if (!req.body.status) throw new Error("No status parameter received");

      const user = req.user as IUser;
      const message = await new ConversationService().updateMessageStatus(
        req.body.status as MessageStatus,
        user._id,
        req.body.id
      );
      return res.status(200).json(message);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

export default router;

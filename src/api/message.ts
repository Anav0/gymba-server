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
      if (!req.body._id) throw new Error("No id of message to update was send");

      if (!req.body.status) throw new Error("No status parameter recived");

      const user = req.user as IUser;
      const message = new ConversationService().updateMessageStatus(
        req.body.status as MessageStatus,
        user._id,
        req.body._id
      );
      return res.status(200).json(message);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

export default router;

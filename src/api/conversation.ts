import { isLoggedIn } from "./index";
import { IUser, IConversation, IMessage } from "../models";
import { Router } from "express";
import { ConversationService } from "../service/conversationService";
const router = Router();

router.get(
  "/",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      const conversations = await new ConversationService().getByParticipantId(
        user._id,
        user._id
      );
      return res.status(200).send(conversations);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

router.get(
  "/last-active",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      const conversationService = new ConversationService();
      const mostRecentMessage = await conversationService.getMostRecentMessage(
        user
      );
      if (!mostRecentMessage) return res.status(200).json({});

      const conversation = await conversationService.getByMessageId(
        mostRecentMessage._id
      );

      return res.status(200).json(conversation);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/participant/:partId/:numberOfPart?",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      const conversationService = new ConversationService();
      const conversations = await conversationService.getByParticipantId(
        user._id,
        req.params.partId,
        req.params.numberOfPart ? +req.params.numberOfPart : -1
      );
      return res.status(200).json(conversations);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

router.get(
  "/:id",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      const conversation = await new ConversationService().getById(
        user._id,
        req.params.id
      );
      return res.status(200).json(conversation);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

router.get(
  "/:id/messages",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    let startDate = new Date().toString();
    let endDate = null;
    const conversationId = req.params.id;

    if (!conversationId)
      throw new Error("There is no conversation id provided");

    if (req.body.startDate && req.body.endDate) {
      startDate = req.body.startDate;
      endDate = req.body.endDate;
    }

    try {
      const conversationService = new ConversationService();
      let messages = [] as IMessage[];
      if (endDate)
        conversationService.getMessagesInBetweenDates(
          conversationId,
          startDate,
          endDate
        );
      else messages = await conversationService.getMessages(conversationId);

      return res.status(200).json(messages);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

router.get(
  "/:id/unread",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const conversationId = req.params.id;
      const user = req.user as IUser;
      const unreadMessages = await new ConversationService().getUnreadMessages(
        user._id,
        conversationId
      );
      return res.status(200).json(unreadMessages);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

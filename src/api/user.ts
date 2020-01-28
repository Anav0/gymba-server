import { IUser } from "../models";
import { isLoggedIn } from "../api";
import { AuthService } from "../service/authService";
import { Router } from "express";
import { UserService } from "../service/userService";
import { TransactionRunner } from "../service/transactionRunner";
import { BotService } from "../service/botService";
import { ConversationService } from "../service/conversationService";
const router = Router();
import uuidv4 from "uuid/v4";
import { StorageService } from "../service/storageService";
import fs from "fs";
import settings from "../settings";
import multer from "multer";

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function(req, file, cb) {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});
var upload = multer({ storage: storage });

router.get("/", async (req, res, next) => {
  try {
    if (req.user) return res.status(200).json(req.user);
    else return res.status(200).json({});
  } catch (error) {
    next(error);
  }
});
router.post("/", upload.any(), async (req, res, next) => {
  const runner = new TransactionRunner();
  const opt = await runner.startSession();
  try {
    runner.startTransaction();
    console.log(req);
    if (req.files) var file = req.files[0];
    if (file) {
      const maxFileSizeInBytes = settings.avatar.maxFileSizeInBytes;

      if (file.size > maxFileSizeInBytes)
        throw new Error(
          `File size is to big. Max is: ${maxFileSizeInBytes / 1000000} mb`
        );

      if (file.mimetype.split("/")[0] != "image")
        throw new Error("Only images as avatars are allowed");

      const storageService = new StorageService();

      const url = await storageService.uploadFile(file);
      req.body.avatarUrl = url;

      fs.unlink(file.path, err => {
        if (err) console.error("Failed to delete this file");
      });
    }
    let user = await new UserService().create(req.body, opt);
    const botService = new BotService();
    const bots = await botService.getAll(opt.session, true);
    for (let i = 0; i < bots.length; i++) {
      let bot = bots[i];
      let conversation = await new ConversationService().createConversation(
        {
          roomId: uuidv4(),
          participants: [bot._id, user._id]
        },
        opt
      );

      user.conversations.push(conversation._id);
      bot.conversations.push(conversation._id);

      user.friends.push(bot._id);
      bot.friends.push(user._id);

      await botService.update(bot._id, bot, opt);
    }
    user = await new UserService().update(user._id, user, opt);
    await new AuthService().sendVerificationEmail(user.email, opt);
    await runner.commitTransaction();
    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
    await runner.abortTransaction();
    await runner.endSession();
    if (file)
      fs.unlink(file.path, err => {
        if (err) console.error("Failed to delete this file");
      });
    next(error);
  }
});
router.patch(
  "/",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      let propertiesToUpdate = req.body;
      let user = req.user as IUser;
      user = await new UserService().update(user._id, propertiesToUpdate, null);
      return res.status(200).json(user);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);
router.post(
  "/remove-friend",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    const runner = new TransactionRunner();
    await runner.startSession();
    return await runner.withTransaction(async session => {
      try {
        const user = req.user as IUser;
        const userService = new UserService();
        const friend = await userService.getById(req.body.id, true, session);

        if (!friend) {
          const bot = await new BotService().getById(
            req.body.id,
            true,
            session
          );
          if (bot) throw new Error("Cannot unfriend chatbot :c");
        }

        if (!friend)
          throw new Error(`No user with given id found: ${req.body.id}`);

        user.friends = user.friends.filter(
          id => id.toString() != friend._id.toString()
        );

        friend.friends = friend.friends.filter(
          id => id.toString() != user._id.toString()
        );

        await userService.update(user._id, user, { session });
        await userService.update(friend._id, friend, { session });

        return res
          .status(200)
          .json(`${friend.fullname} is no longer your friend`);
      } catch (error) {
        console.error(error);
        next(error);
      }
    });
  }
);

router.get(
  "/suggested-friends",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      const users = await new UserService().getListOfSuggestedFriends(user);
      return res.status(200).json(users);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

router.post(
  "/avatar",
  (req, res, next) => isLoggedIn(req, res, next),
  upload.any(),
  async (req, res, next) => {
    var filePath = "";
    try {
      const file = req.files[0];
      if (!file) throw new Error("No file provided");
      filePath = file.path;
      let user = req.user as IUser;

      const maxFileSizeInBytes = settings.avatar.maxFileSizeInBytes;

      if (file.size > maxFileSizeInBytes)
        throw new Error(
          `File size is to big. Max is: ${maxFileSizeInBytes / 1000000} mb`
        );

      if (file.mimetype.split("/")[0] != "image")
        throw new Error("Only images as avatars are allowed");

      const userService = new UserService();
      const storageService = new StorageService();

      if (user.avatarUrl) {
        const filename = user.avatarUrl.split("/").pop();
        await storageService.deleteFile(filename);
      }
      const url = await storageService.uploadFile(file);
      user.avatarUrl = url;

      user = await userService.update(user._id, user);

      fs.unlink(file.path, err => {
        if (err) console.error("Failed to delete this file");
      });

      return res.status(200).send(user);
    } catch (error) {
      fs.unlink(filePath, err => {
        if (err) console.error("Failed to delete this file");
      });
      next(error);
    }
  }
);

export default router;

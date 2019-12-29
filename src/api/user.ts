import { IUser } from "../models";
import { isLoggedIn } from "../api";
import { AuthService } from "../service/authService";
import { Router } from "express";
import { UserService } from "../service/userService";
import { TransactionRunner } from "../service/transactionRunner";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    if (req.user) return res.status(200).json(req.user);
    else return res.status(200).json({});
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    let user = await new UserService().create({
      ...req.body,
      creationDate: new Date()
    });
    await new AuthService().sendVerificationEmail(user.email);
    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
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
    const opt = await runner.startSession();
    //TODO: find a way to make transactions work with multiple services
    try {
      runner.startTransaction();
      const user = req.user as IUser;
      const userService = new UserService();
      const friend = await userService.getById(req.body.id, true);

      if (!friend) throw new Error("No user with given id found");

      user.friends = user.friends.filter(
        id => id.toString() != friend._id.toString()
      );
      //await user.save(opt);
      await userService.update(user._id, user, opt);

      friend.friends = friend.friends.filter(
        id => id.toString() != user._id.toString()
      );
      //await friend.save(opt);
      await userService.update(friend._id, friend, opt);

      runner.commitTransaction();
      return res
        .status(200)
        .json(`${friend.fullname} is no longer your friend`);
    } catch (error) {
      console.error(error);
      await runner.abortTransaction();
      runner.endSession();
      next(error);
    }
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

export default router;

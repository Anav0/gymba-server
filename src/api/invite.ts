import { isLoggedIn } from "./index";
import { IUser } from "../models";
import { Router } from "express";
import { InvitationService } from "../service/invitationService";
import { TransactionRunner } from "../service/transactionRunner";
import { UserService } from "../service/userService";
const router = Router();

router.post(
  "/",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    const transactionRunner = new TransactionRunner();
    const opt = await transactionRunner.startSession();
    try {
      transactionRunner.startTransaction();
      const user = req.user as IUser;
      let userId = user._id;
      let targetId = req.body.targetId;
      const invitationService = new InvitationService();
      const userService = new UserService();
      //Check if user and target are not the same
      if (userId == targetId) throw new Error("You cannot befriend yourself");

      //Check if targetId is not already our friend
      for (const friendId of user.friends) {
        if (friendId == targetId) throw new Error("You are already friends");
      }

      //Check if invitation already exists
      const results = await invitationService.getInvitationInvolving(
        userId,
        targetId,
        "",
        opt.session
      );

      if (results) throw new Error("Invitation was already send");
      const invitation = await invitationService.createInvitation(
        {
          date: +Date.now(),
          sender: userId,
          target: targetId
        } as any,
        opt
      );

      let invitedUser = await userService.getById(targetId, true, opt.session);

      if (!invitedUser) throw new Error("Targeted user does't exist");

      //TODO: if not cast to string it will not compare well at accept invite level
      invitedUser.invitations.push(invitation._id);

      userService.update(invitedUser._id, invitedUser, opt);

      await transactionRunner.commitTransaction();
      return res.status(200).json(invitation);
    } catch (error) {
      console.error(error);
      await transactionRunner.abortTransaction();
      transactionRunner.endSession();
      next(error);
    }
  }
);

router.get(
  "/single/:id",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      const invite = new InvitationService().getById(
        req.params.id,
        user._id,
        null
      );
      if (!invite) throw new Error("No invitation found");
      return res.status(200).json(invite);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

router.post(
  "/involves",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;

      const invite = await new InvitationService().getInvitationInvolving(
        user._id,
        req.body.userId,
        req.body.populate
      );
      return res.status(200).json(invite);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

router.post(
  "/accept",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      await new InvitationService().acceptInvitation(req.body.id, user._id);
      return res.status(200).json("Invitation accepted");
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

router.post(
  "/reject",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      //TODO: thing about i18n, maybe passing lang param will do the trick | maybe i18n service?
      await new InvitationService().rejectInvitation(req.body.id, user._id);
      return res.status(200).send("Invitation rejected successfully");
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);
router.post(
  "/sent",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      const invites = await new InvitationService().getSentInvitations(
        user._id,
        req.body.populate
      );

      return res.status(200).json(invites);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);
router.post(
  "/recived",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      const invites = await new InvitationService().getRecivedInvitations(
        user._id,
        req.body.populate
      );
      return res.status(200).json(invites);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

export default router;

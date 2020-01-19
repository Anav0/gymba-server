import { Router } from "express";
const router = Router();
import { isLoggedIn } from "./index";
import { ActivityService } from "../service/activityService";

router.get(
  "/:userId",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      if (!req.params.userId) throw new Error("No 'userId' parameter found");

      const activity = await new ActivityService().getByUserId(
        req.params.userId
      );
      return res.status(200).json(activity);
    } catch (error) {
      next(error);
    }
  }
);
router.get(
  "/users/active",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const activeUsersIds = await new ActivityService().getActiveUsersIds();
      return res.status(200).json(activeUsersIds);
    } catch (error) {
      next(error);
    }
  }
);
export default router;

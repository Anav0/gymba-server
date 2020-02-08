import { isLoggedIn } from "./index";
import { Router } from "express";
const router = Router();
import { AuthService } from "../service/authService";
import { UserService } from "../service/userService";
import { IUser } from "../models";

router.post("/login", async (req, res, next) => {
  try {
    const response = await new AuthService().login(req, res, next);
    return res.status(200).send(response);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/logout",
  (req, res, next) => isLoggedIn(req, res, next),
  async (req, res, next) => {
    try {
      const user = req.user as IUser;
      await new AuthService().logout(req);
      res.status(200).send("Logout successfull");
    } catch (error) {
      next(error);
    }
  }
);

router.get("/verify/:id/:token", async (req, res, next) => {
  try {
    const token = req.params.token;
    const userId = req.params.id;
    await new AuthService().verifyUser(userId, token);
    return res.status(200).send("Email verified");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post("/resend-email", async (req, res, next) => {
  try {
    const userId = req.body.id;
    //Get user
    await new AuthService().reVerifyUser(userId);
    return res.status(200).send("Email verification send");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post("/resend-email/:email", async (req, res, next) => {
  try {
    const email = req.params.email;

    const user = await new UserService().getByEmail(email);

    if (!user) throw new Error("Found no account with this email address");

    //Get user
    await new AuthService().reVerifyUser(user._id);
    return res.status(200).send("Email verification send");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

export default router;

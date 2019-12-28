import { Router } from "express";
const router = Router();
import EmailService from "../service/emailService";

router.post("/", async (req, res, next) => {
  try {
    if (!req.body.sender || !req.body.content)
      throw new Error("No sender or content provided");

    await new EmailService().sendEmail(
      process.env.MY_EMAIL,
      req.body.sender,
      "Gymba opinion",
      req.body.content,
      req.body.content
    );
    return res.status(200).send("Opinion send successfully");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

export default router;

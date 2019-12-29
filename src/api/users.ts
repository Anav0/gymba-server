import { Router } from "express";
import { UserService } from "../service/userService";
const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const users = await new UserService().getUsers();
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await new UserService().getById(req.params.id);
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

export default router;

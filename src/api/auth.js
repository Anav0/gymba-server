import { isLoggedIn } from "./index";
import passport from "passport";
import express from "express";
const router = express.Router();

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) { return res.status(400).send(info); }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            let responce = {
                user: user,
                session: req.session
            }
            return res.status(200).send(responce)
        });
    })(req, res, next);
});

router.get("/logout", isLoggedIn, (req, res) => {
    req.logOut();
    res.status(200).send("Logout successfull");
});

export default router;
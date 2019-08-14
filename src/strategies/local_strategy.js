import Strategy from "passport-local";
import passport from "passport";
import { UserModel } from "../schemas";

passport.use(
  new Strategy((username, password, done) => {
    username = username.trim();
    password = password.trim();
    UserModel.findOne({ username: username }, (err, user) => {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { errors: ["Wrong username or password."] });
      }
      if (!user.isEmailVerified)
        return done(null, false, {
          errors: ["Email is not verified."]
        });

      user.comparePassword(password, (err, isMatch) => {
        if (err) return done(err);

        if (!isMatch)
          return done(null, false, { errors: ["Wrong username or password."] });

        if (isMatch) return done(null, user);
      });
    });
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  UserModel.findById(id, (err, user) => {
    done(err, user);
  });
});

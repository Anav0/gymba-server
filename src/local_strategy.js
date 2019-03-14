import Strategy from "passport-local";
import passport from "passport";

import { UserModel } from "./schemas/user";

passport.use(
  new Strategy(function(username, password, done) {
    username = username.trim();
    password = password.trim();
    UserModel.findOne({ username: username }, function(err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "Wrong username or password." });
      }
      if (!user.isEmailVerified)
        return done(null, false, {
          message: "Email is not verified."
        });

      user.comparePassword(password, (err, isMatch) => {
        if (err) return done(err);

        if (!isMatch)
          return done(null, false, { message: "Wrong username or password." });

        if (isMatch) return done(null, user);
      });
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  UserModel.findById(id, function(err, user) {
    done(err, user);
  });
});

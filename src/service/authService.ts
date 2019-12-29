import { IUser, UserModel } from "../models";
import settings from "../settings";
import EmailService from "./emailService";
import passport from "passport";
import { Strategy } from "passport-local";
import { UserService } from "./userService";
import moment from "moment";
import uuidv4 from "uuid/v4";

passport.use(
  new Strategy(async (username: string, password: string, done: Function) => {
    username = username.trim();
    password = password.trim();
    try {
      const user = await new UserService().getByUsername(username, true);
      if (!user) {
        return done(new Error("Wrong username or password"), null);
      }
      if (!user.isEmailVerified)
        return done(new Error("Email is not verified"), null);

      user.comparePassword(password, (error, isMatch) => {
        if (error) return done(error);

        if (!isMatch)
          return done(new Error("Wrong username or password"), null);

        if (isMatch) return done(null, user);
      });
    } catch (error) {
      console.error(error);
      return done(error, null);
    }
  })
);

passport.serializeUser((user: IUser, done: Function) => {
  return done(null, user._id);
});

passport.deserializeUser(async (id: string, done: Function) => {
  const user = await new UserService().getById(id, true);
  if (!user) return done("No user found", null);
  return done(null, user);
});

export interface IAuthService {
  login(req, res, next): Promise<loginResponse>;
  logout(req: any): Promise<void>;
  isUserVerified(id: string): Promise<boolean>;
  verifyUser(id: string, token: string): Promise<void>;
  reVerifyUser(id: string): Promise<void>;
  sendVerificationEmail(email: string, transaction: any): Promise<any>;
}
export class loginResponse {
  user: IUser;
  session: any;
}

export class AuthService implements IAuthService {
  login(req, res, next): Promise<loginResponse> {
    return new Promise((resolve, reject) => {
      passport.authenticate("local", (error, user, info) => {
        if (error) {
          return reject(error);
        }
        if (!user) {
          return resolve(info);
        }
        req.logIn(user, error => {
          if (error) {
            return reject(error);
          }
          let responce = {
            user: user,
            session: req.session
          } as loginResponse;
          return resolve(responce);
        });
      })(req, res, next);
    });
  }
  logout(req: any): Promise<void> {
    return new Promise((resolve, reject) => {
      req.logout();
      return resolve();
    });
  }
  isUserVerified(id: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const userService = new UserService();
        const user = await userService.getById(id, true);
        if (!user) return reject(new Error("No user with given id found"));
        if (user.isEmailVerified) return resolve(true);
        else return resolve(false);
      } catch (error) {
        reject(error);
      }
    });
  }

  reVerifyUser(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await new UserService().getById(id, true);

        if (!user._id) return reject(new Error("No user with given id found"));

        //Check if email is not already verified
        if (user.isEmailVerified)
          return reject(new Error("Email is already verified"));

        if (user.emailVerificationSendDate) {
          let diff = moment().diff(
            moment(user.emailVerificationSendDate),
            settings.validationEmailResend.unit as moment.unitOfTime.Base
          );
          if (diff < settings.validationEmailResend.validFor)
            return reject(
              new Error(
                `You can request resend after waiting ${settings.validationEmailResend.validFor} ${settings.validationEmailResend.unit}`
              )
            );
        }

        await new AuthService().sendVerificationEmail(user.email);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  verifyUser(id: string, token: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await new UserService().getById(id, true);
        if (!user) return reject(new Error("No user with given id found"));
        if (user.isEmailVerified)
          return reject(new Error("User is already verified"));
        //Check if verification date is not > 7 days
        if (
          moment(user.emailVerificationSendDate).diff(
            Date.now(),
            settings.validationEmail.unit as moment.unitOfTime.Base
          ) > settings.validationEmail.validFor
        )
          return reject(new Error("Verification link expired"));

        //Check if token match
        if (user.emailVerificationToken != token)
          return reject(new Error("Invalid token"));

        user.isEmailVerified = true;
        user.expireAt = undefined;
        user.emailVerificationToken = undefined;
        user.emailVerificationSendDate = undefined;
        await user.save();
        return resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  async sendVerificationEmail(
    email: string,
    transaction: any = null
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        //Generate random guid
        const token = uuidv4();
        const userService = await new UserService();
        let user = await userService.getByEmail(email);

        if (!user) return reject(new Error("No user with given email found"));

        user.emailVerificationToken = token;
        user.emailVerificationSendDate = +Date.now();
        user.isEmailVerified = false;
        user.creationDate = +Date.now();
        user.expireAt = moment(Date.now())
          .add(
            settings.user.validFor,
            settings.user.unit as moment.unitOfTime.Base
          )
          .valueOf();

        //Create verification link containing user id and token
        const verificationLink = `${process.env.SERVER_URL}:${process.env.SERVER_PORT}/auth/verify/${user._id}/${token}`;
        const htmlLink = `<a href="${verificationLink}">link</a>`;
        const messageOne = "This is your email verification link:";
        const messageTwo = `it will expire in ${settings.validationEmail.validFor} ${settings.validationEmail.unit}`;

        await userService.update(user._id, user, transaction);

        //Send verification email
        return resolve(
          new EmailService().sendEmail(
            email,
            process.env.MY_EMAIL,
            "Chat account verification",
            `${messageOne} ${verificationLink} ${messageTwo}`,
            `<p> ${messageOne} ${htmlLink} ${messageTwo} </p>`
          )
        );
      } catch (error) {
        reject(error);
      }
    });
  }
}

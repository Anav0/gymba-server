import { IUser } from "../models";
import settings from "../settings";
import passport from "passport";
import { Strategy } from "passport-local";
import EmailService from "./emailService";
import { UserService } from "./userService";
import { VerificationService } from "./verificationService";
import moment from "moment";
import uuidv4 from "uuid/v4";
import { TransactionRunner } from "./transactionRunner";
import { IVerification } from "../models/verification";

passport.use(
  new Strategy(async (username: string, password: string, done: Function) => {
    username = username.trim();
    password = password.trim();
    try {
      const user = await new UserService().getByUsername(username, true);
      if (!user) {
        return done(new Error("Wrong username or password"), null);
      }
      const verification = await new VerificationService().getByUser(user._id);
      if (verification) return done(new Error("Email is not verified"), null);

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
  // if (!user) return done("No user found", null);
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
  readonly user: IUser;
  readonly session: any;
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
        const verification = await new VerificationService().getByUser(
          user._id
        );
        if (!verification) return resolve(true);
        else return resolve(false);
      } catch (error) {
        reject(error);
      }
    });
  }

  reVerifyUser(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const runner = new TransactionRunner();
      await runner.startSession();
      return await runner.withTransaction(async session => {
        try {
          const user = await new UserService().getById(id, true, session);

          if (!user._id)
            return reject(new Error("No user with given id found"));

          //Check if email is not already verified
          const verification = await new VerificationService().getByUser(
            user._id,
            session
          );
          if (!verification)
            return reject(new Error("Email is already verified"));

          if (verification.sendDate) {
            let diff = moment().diff(
              moment(verification.sendDate),
              settings.validationEmailResend.unit as moment.unitOfTime.Base
            );
            if (diff < settings.validationEmailResend.validFor)
              return reject(
                new Error(
                  `You can request resend after waiting ${settings.validationEmailResend.validFor} ${settings.validationEmailResend.unit}`
                )
              );
          }

          await new AuthService().sendVerificationEmail(user.email, {
            session
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  verifyUser(id: string, token: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const runner = new TransactionRunner();
      await runner.startSession();
      return await runner.withTransaction(async session => {
        try {
          const user = await new UserService().getById(id, true, session);
          if (!user) return reject(new Error("No user with given id found"));
          const verificationService = new VerificationService();
          const verification = await verificationService.getByUser(
            user._id,
            session
          );
          if (!verification)
            return reject(new Error("User is already verified"));
          //Check if verification date is not > 7 days
          if (
            moment(verification.sendDate).diff(
              Date.now(),
              settings.validationEmail.unit as moment.unitOfTime.Base
            ) > settings.validationEmail.validFor
          )
            return reject(new Error("Verification link expired"));

          //Check if token match
          if (verification.token != token)
            return reject(new Error("Invalid token"));

          await verificationService.remove(verification._id, session);

          user.expireAt = undefined;
          await user.save();
          return resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  async sendVerificationEmail(email: string, transaction: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        //Generate random guid
        const token = uuidv4();
        const userService = await new UserService();
        let user = await userService.getByEmail(
          email,
          true,
          transaction.session
        );

        if (!user) return reject(new Error("No user with given email found"));
        const verificationService = new VerificationService();

        const prevVerification = await verificationService.getByUser(
          user._id,
          transaction.session
        );

        if (prevVerification) {
          prevVerification.sendDate = +Date.now();
          prevVerification.token = token;
          prevVerification.expireAt = moment(Date.now())
            .add(
              settings.user.validFor,
              settings.user.unit as moment.unitOfTime.Base
            )
            .valueOf();
          verificationService.update(prevVerification._id, prevVerification);
        } else
          await verificationService.create(
            {
              user: user._id,
              token,
              sendDate: +Date.now()
            } as IVerification,
            transaction.session
          );
        user.expireAt = moment(Date.now())
          .add(
            settings.user.validFor,
            settings.user.unit as moment.unitOfTime.Base
          )
          .valueOf();

        await userService.update(user._id, user, transaction);

        //Create verification link containing user id and token
        const verificationLink = `${process.env.CLIENT_URL}/verification/${user._id}/${token}`;

        //Send verification email
        const response = await new EmailService().sendTemplateEmail(
          email,
          process.env.COMPANY_EMAIL,
          "Chat account verification",
          "d-f39e7d29ebd04e74bff78c4e28ebdf13",
          {
            validationLink: verificationLink,
            validFor: `${settings.validationEmail.validFor} ${settings.validationEmail.unit}`
          }
        );
        return resolve(response);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }
}

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import uniqueValidator from "mongoose-unique-validator";

const Schema = mongoose.Schema;
export interface IUser extends mongoose.Document {
  _id: string;
  username: string;
  fullname: string;
  desc: string;
  creationDate: number;
  avatarUrl: string;
  friends: string[];
  invitations: string[];
  conversations: string[];
  expireAt: number;
  password: string;
  email: string;
  isEmailVerified: boolean;
  emailVerificationSendDate: number;
  emailVerificationToken: string;
  comparePassword: Function;
}
const publicInfo = {
  username: {
    type: String,
    required: [true, "Username is required"],
    maxlength: [250, "Username max length is 250"],
    unique: true,
    trim: true
  },
  fullname: {
    type: String,
    required: [true, "Fullname is required"],
    maxlength: [250, "Name max length is 250"],
    trim: true
  },
  desc: {
    type: String,
    required: false,
    maxlength: [500, "Name max length is 500"],
    trim: true
  },
  creationDate: {
    type: Date,
    required: true
  },
  avatarUrl: {
    type: String
  },
  friends: [{ type: Schema.Types.ObjectId, ref: "User" }]
};

const User = new Schema<IUser>({
  expireAt: {
    type: Date
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password needs to be at least 6 characters long"],
    maxlength: [250, "Password max length is 250"],
    trim: true
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    maxlength: 250,
    trim: true,
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid email address"
    ]
  },
  isEmailVerified: {
    type: Boolean
  },
  emailVerificationSendDate: {
    type: Date
  },
  emailVerificationToken: {
    type: String
  },
  conversations: [{ type: Schema.Types.ObjectId, ref: "Conversation" }],
  invitations: [{ type: Schema.Types.ObjectId, ref: "Invitation" }]
});

User.add(publicInfo);

//Delete user after expireAt date
//It's only if user didn't verify his or her email
User.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

User.method("comparePassword", function(
  candidatePassword: string,
  callback: Function
) {
  bcrypt.compare(candidatePassword, this.password, (error, isMatch) => {
    if (error) return callback(error);
    callback(null, isMatch);
  });
});

//WARNING! this function cannot have arrow syntax becouse "this" will be undefined
User.pre<IUser>("save", function(next) {
  var user = this;

  //only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) return next();

  //TODO: if password gets changed logut out user from all devices

  //generate a salt
  bcrypt.genSalt((error, salt) => {
    if (error) return next(error);

    //hash the password
    bcrypt.hash(user.password, salt, (error, hash) => {
      if (error) return next(error);

      //override the cleartext password with the hashed one
      user.password = hash;

      //go to next middleware
      next();
    });
  });
});

export const getUserModelPublicInfo = () => {
  return Object.getOwnPropertyNames(publicInfo);
};

User.plugin(uniqueValidator, { errors: ["{VALUE} is already taken"] });
export const UserModel = mongoose.model<IUser>("User", User);

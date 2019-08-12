import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import uniqueValidator from 'mongoose-unique-validator'

const Schema = mongoose.Schema;

const publicInfo = {
  username: {
    type: String,
    required: [true, 'Username is required'],
    maxlength: [250, "Username max length is 250"],
    index: { unique: true },
    trim: true
  },
  fullname: {
    type: String,
    required: [true, 'Fullname is required'],
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
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}

const User = new Schema({
  expireAt: {
    type: Date
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, "Password needs to be at least 6 characters long"],
    maxlength: [250, "Password max length is 250"],
    trim: true
  },
  //TODO: make this field unique only after testing
  email: {
    type: String,
    required: [true, 'Email is required'],
    maxlength: 250,
    trim: true,
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
  conversations: [{ type: Schema.Types.ObjectId, ref: 'Conversation' }],
  invitations: [{ type: Schema.Types.ObjectId, ref: 'Invitation' }],
});

User.add(publicInfo)

//Delete user after expireAt date
//It's only if user didn't verify his or her email
User.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

/* Mongoose middleware is not invoked on update() operations,
 so you must use a save() if you want to update user passwords */

//WARNING! this function cannot have arrow syntax becouse "this" will be undefined
User.pre("save", function (next) {
  var user = this;

  //only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) return next();

  //TODO: if password gets changed logut out user from all devices

  //generate a salt
  bcrypt.genSalt((err, salt) => {
    if (err) return next(err);

    //hash the password
    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) return next(err);

      //override the cleartext password with the hashed one
      user.password = hash;

      //go to next middleware
      next();
    });
  });
});

User.methods.comparePassword = (candidatePassword, callback) => {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

export const getUserModelPublicInfo = () => {
  return Object.getOwnPropertyNames(publicInfo)
}

User.plugin(uniqueValidator, { message: "{VALUE} is already taken" })
export const UserModel = mongoose.model("User", User);

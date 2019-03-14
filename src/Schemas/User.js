import mongoose from "mongoose";
import bcrypt from "bcrypt";

var Schema = mongoose.Schema;

const User = new Schema({
  expireAt: {
    type: Date
  },
  username: {
    type: String,
    required: true,
    maxlength: 250,
    index: { unique: true },
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: [6, "Password needs to be at least 6 characters long"],
    maxlength: [250, "Password max length is 250"],
    trim: true
  },
  fullname: {
    type: String,
    required: true,
    maxlength: [500, "Name max length is 250"],
    trim: true
  },
  avatarUrl: {
    type: String
  },
  //TODO: make this field unique only after testing
  email: {
    type: String,
    required: true,
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

  creationDate: {
    type: Date,
    required: true
  },

  friends: Array,
  conversations: Array,
  invitations: Array,
  bannedBy: Array,
  mutedBy: Array,
  sendMessages: Array
});

//Delete user after expireAt date
//It's only if user didn't verify his or her email
User.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

/* Mongoose middleware is not invoked on update() operations,
 so you must use a save() if you want to update user passwords */

//WARNING! this function cannot have arrow syntax becouse "this" will be undefined
User.pre("save", function(next) {
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

User.methods.comparePassword = function(candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

export const UserModel = mongoose.model("User", User);

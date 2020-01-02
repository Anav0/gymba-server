import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const Schema = mongoose.Schema;
export interface IVerification extends mongoose.Document {
  user: string;
  sendDate: number;
  token: string;
}

export const Verification = new Schema<IVerification>(
  {
    user: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
      }
    ],
    sendDate: {
      type: Date,
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true
    }
  },
  { timestamps: { createdAt: "creationDate" } }
);

//Delete user after expireAt date
//It's only if user didn't verify his or her email
Verification.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

Verification.plugin(uniqueValidator, { message: "{VALUE} is already taken" });
export const VerificationModel = mongoose.model<IVerification>(
  "Verification",
  Verification
);

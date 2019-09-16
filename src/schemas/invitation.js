import mongoose from "mongoose";
import { UserModel } from "./";

var Schema = mongoose.Schema;

const Invitation = new Schema({
  date: {
    type: Date,
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  target: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});
Invitation.pre('remove', async function (next) {
  try {
    const target = await UserModel.findById(this.target);
    target.invitations = target.invitations.filter((inviteId) => inviteId.toString() != this._id.toString());
    await target.save();
    next()
  } catch (err) {
    next(err)
  }

})


export const InvitationModel = mongoose.model("Invitation", Invitation);

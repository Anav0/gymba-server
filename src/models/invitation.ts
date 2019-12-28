import mongoose, { Schema, Document } from "mongoose";
import { UserModel, IUser } from ".";

export interface IInvitation extends Document {
  date: number
  sender: string
  target: string
};

const Invitation = new Schema<IInvitation>({
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
Invitation.pre<IInvitation>('remove', async function (next) {
  try {
    const target = await UserModel.findById(this.target) as IUser;
    target.invitations = target.invitations.filter((inviteId) => inviteId.toString() != this._id.toString());
    await target.save();
    next()
  } catch (err) {
    next(err)
  }

})

export const InvitationModel = mongoose.model<IInvitation>("Invitation", Invitation);

import mongoose from "mongoose";

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

export const InvitationModel = mongoose.model("Invitation", Invitation);

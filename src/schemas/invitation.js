import mongoose from "mongoose";

var Schema = mongoose.Schema;

const Invitation = new Schema({
  date: {
    type: Date,
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  targetId: {
    type: String,
    required: true
  }
});

export const InvitationModel = mongoose.model("Invitation", Invitation);

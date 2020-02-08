import mongoose from "mongoose";
const Schema = mongoose.Schema;

export interface IActivity extends mongoose.Document {
  user: string;
  isOnline: boolean;
  socketId: string;
}

const Activity = new Schema<IActivity>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    isOnline: {
      type: Boolean,
      required: true
    },
    socketId: {
      type: String
    }
  },
  { timestamps: { createdAt: "creationDate" } }
);
export const ActivityModel = mongoose.model<IActivity>("Activity", Activity);

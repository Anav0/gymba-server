import mongoose from "mongoose";
const Schema = mongoose.Schema;

export interface IConversation extends mongoose.Document {
  roomId: string;
  participants: string[];
  messages: string[];
}

const Conversation = new Schema<IConversation>(
  {
    roomId: {
      type: String,
      required: true
    },
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }]
    },
    messages: [{ type: Schema.Types.ObjectId, ref: "Message" }]
  },
  { timestamps: { createdAt: "creationDate" } }
);
//TODO: add pre update hook to check if number of participants is not < 2. If so delete the conversation
export const ConversationModel = mongoose.model<IConversation>(
  "Conversation",
  Conversation
);

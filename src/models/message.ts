import mongoose from "mongoose";
/*
  Dodać zapis ustawień do bazy danych, zmienić zachowanie w oparciu o ustawienia
*/
const Schema = mongoose.Schema;
export enum MessageStatus {
  send = "send",
  delivered = "delivered",
  received = "received"
}
export interface IMessage extends mongoose.Document {
  sendDate: Date;
  conversationId: string;
  sender: string;
  status: MessageStatus;
  content: string;
}
const Message = new Schema<IMessage>({
  sendDate: {
    type: Date,
    required: true
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: Object.values(MessageStatus).filter(
      status => typeof status == "string"
    ),
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [500, "Message max length exceeded"]
  }
});

export const MessageModel = mongoose.model<IMessage>("Message", Message);

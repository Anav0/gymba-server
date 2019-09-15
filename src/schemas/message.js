import mongoose from "mongoose";

var Schema = mongoose.Schema;

const Message = new Schema({
    sendDate: {
        type: Date,
        required: true
    },
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['send', 'delivered', 'received'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
});

export const MessageModel = mongoose.model("Message", Message);

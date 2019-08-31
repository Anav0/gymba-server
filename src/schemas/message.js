import mongoose from "mongoose";

var Schema = mongoose.Schema;

const Message = new Schema({
    sendDate: {
        type: Date,
        required: true
    },
    conversationId: {
        type: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    },
    sender: {
        type: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    status: {
        type: String,
        required: true,
        enum: ['send', 'delivered', 'received']
    },
    content: {
        type: String,
        required: true,
    },
});

export const MessageModel = mongoose.model("Message", Message);

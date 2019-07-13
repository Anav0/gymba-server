import mongoose from "mongoose";

var Schema = mongoose.Schema;

const Message = new Schema({
    sendDate: {
        type: Date,
        required: true
    },
    sender: {
        type: { type: Schema.Types.ObjectId, ref: 'User' },
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Send', 'Delivered', 'Received']
    },
    content: {
        type: String,
        required: true,
    },
});

export const MessageModel = mongoose.model("Message", Message);

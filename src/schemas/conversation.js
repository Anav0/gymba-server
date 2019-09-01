import mongoose from "mongoose";

var Schema = mongoose.Schema;

const Conversation = new Schema({
    roomId: {
        type: String,
        required: true
    },
    participants: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    },
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
});
//TODO: add pre update hook to check if number of participants is not < 2. If so delete the conversation
export const ConversationModel = mongoose.model("Conversation", Conversation);

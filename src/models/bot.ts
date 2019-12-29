import mongoose from "mongoose";
import uniqueValidator from 'mongoose-unique-validator'

const Schema = mongoose.Schema;

export interface IBot extends mongoose.Document {
    botName: string
    displayName: string
    desc: string
    creationDate: number
    avatarUrl: string,
    conversations: Array<mongoose.Schema.Types.ObjectId>
}

const publicInfo = {
    botName: {
        type: String,
        required: [true, 'Bot name is required'],
        maxlength: [250, "Bot name max length is 250"],
        unique: true,
        trim: true
    },
    displayName: {
        type: String,
        required: [true, 'Display name is required'],
        maxlength: [250, "Name max length is 250"],
        trim: true
    },
    desc: {
        type: String,
        required: false,
        maxlength: [500, "Name max length is 500"],
        trim: true
    },
    creationDate: {
        type: Date,
        required: true
    },
    avatarUrl: {
        type: String
    },
}

const Bot = new Schema<IBot>({
    conversations: [{ type: Schema.Types.ObjectId, ref: 'Conversation' }],
});
Bot.add(publicInfo);

export const getBotModelPublicInfo = () => {
    return Object.getOwnPropertyNames(publicInfo)
}

Bot.plugin(uniqueValidator, { errors: ["{VALUE} is already taken"] });
export const BotModel = mongoose.model<IBot>("Bot", Bot);

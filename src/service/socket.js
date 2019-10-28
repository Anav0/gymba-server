import {MessageModel, UserModel, ConversationModel, BotModel} from "../schemas";
import mongoose from "mongoose";
import server from "../server";
console.log("Initializing sockets...")
var io = require('socket.io')(server);
const chat = io.of('/chat');

chat.on('connection', (socket) => {

    socket.on('join', (data) => {
        socket.join(data.roomId);
        socket.to(data.roomId).emit('user join room', `${data.username} join room`)
    });

    socket.on('is typing', data => {
        socket.to(data.roomId).emit('user is typing', data.user)
    });

    socket.on('stoped typing', data => {
        socket.to(data.roomId).emit('user stoped typing', data.user)
    });
    // socket.on('bot message', async (data) => {
    //     const session = await mongoose.startSession();
    //     const opt = { session };
    //     try {
    //         session.startTransaction();
    //         const conversation = await ConversationModel.findById(data.conversationId).exec();
    //         const sender = await UserModel.findById(data.userId).exec();
    //
    //         //TODO: make this better
    //         if (!conversation || !sender)
    //             throw new Error("No conversation or sender found")
    //
    //         let message = new MessageModel({
    //             sender: data.userId,
    //             sendDate: new Date(),
    //             conversationId: data.conversationId,
    //             content: data.message,
    //             status: "send"
    //         })
    //
    //         message = await message.save(opt);
    //         conversation.messages.push(message._id);
    //         await conversation.save(opt);
    //
    //         await message.populate('sender').execPopulate();
    //
    //         const response = BotModel
    //
    //         await session.commitTransaction();
    //         chat.to(data.roomId).emit('new message', message)
    //     } catch (error) {
    //         await session.abortTransaction();
    //         session.endSession();
    //         chat.to(data.roomId).emit('failed to send message', { error: error, message: data.message })
    //     }
    // });
    socket.on('private message', async (data) => {
        const session = await mongoose.startSession();
        const opt = { session };
        try {
            session.startTransaction();
            const conversation = await ConversationModel.findById(data.conversationId).exec();
            const sender = await UserModel.findById(data.userId).exec();

            //TODO: make this better
            if (!conversation || !sender)
                throw new Error("No conversation or sender found")

            let message = new MessageModel({
                sender: data.userId,
                sendDate: new Date(),
                conversationId: data.conversationId,
                content: data.message,
                status: "send"
            })

            message = await message.save(opt);
            conversation.messages.push(message._id)
            await conversation.save(opt);

            await message.populate('sender').execPopulate();
            await session.commitTransaction();
            chat.to(data.roomId).emit('new message', message)
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            chat.to(data.roomId).emit('failed to send message', { error: error, message: data.message })
        }
    });

});

console.log("Done!")

export default chat;


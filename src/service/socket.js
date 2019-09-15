import { MessageModel, UserModel, ConversationModel } from "../schemas";
import mongoose from "mongoose";

export const initializeSocket = (server) => {
    console.log("Initializing sockets...")
    var io = require('socket.io')(server);
    const chat = io.of('/chat');

    chat.on('connection', (socket) => {

        socket.on('join', (data) => {
            console.log(data)
            socket.join(data.roomId);
            socket.to(data.roomId).emit('user join room', `${data.username} join room`)
        });

        socket.on('private message', async (data) => {
            const session = await mongoose.startSession();
            const opt = { session };
            try {
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
                chat.to(data.roomId).emit('new message', message)
            } catch (error) {
                console.error(error);
                await session.abortTransaction();
                session.endSession();
                chat.to(data.roomId).emit('failed to send message', message)
            }
        });


    });

    console.log("Done!")
}


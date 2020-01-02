import server from "../server";
import {
  MessageStatus,
  IMessage,
  SocketMessageInfo,
  SocketUserInfo
} from "../models";
import { TransactionRunner } from "./transactionRunner";
import { ConversationService } from "./conversationService";
import { UserService } from "./userService";
import { BotService } from "./botService";
import SocketBotMessageInfo from "../models/socket/SocketBotMessageInfo";
console.log("Initializing sockets...");
const io = require("socket.io")(server);
const chat = io.of("/chat");

chat.on("connection", socket => {
  socket.on("join", (data: SocketUserInfo) => {
    socket.join(data.roomId);
    socket.to(data.roomId).emit("user join room", data.user.fullname);
  });

  socket.on("user left", (data: SocketUserInfo) => {
    socket.to(data.roomId).emit("user left room", data.user.fullname);
  });

  socket.on("is typing", (data: SocketUserInfo) => {
    socket.to(data.roomId).emit("user is typing", data.user);
  });

  socket.on("stoped typing", (data: SocketUserInfo) => {
    socket.to(data.roomId).emit("user stoped typing", data.user);
  });

  socket.on("private message", async (data: SocketMessageInfo) => {
    const runner = new TransactionRunner();
    await runner.startSession();
    await runner.withTransaction(async session => {
      await saveMessage(data, session);
    });
  });

  socket.on("bot message", async (data: SocketBotMessageInfo) => {
    await new Promise(async (resolve, reject) => {
      const runner = new TransactionRunner();
      await runner.startSession();
      await runner.withTransaction(async session => {
        try {
          await saveMessage(data, session);

          const botResponse = await new BotService().getBotResponse(
            data.botId,
            data.message,
            session
          );
          await saveMessage(
            {
              message: botResponse.message,
              conversationId: data.conversationId,
              roomId: data.roomId,
              userId: botResponse.bot._id
            } as SocketMessageInfo,
            session
          );
          resolve(botResponse);
        } catch (error) {
          chat.to(data.roomId).emit("failed to send message", {
            error: error,
            message: data.message
          });
          reject(error);
        }
      });
    });
  });

  async function saveMessage(data: SocketMessageInfo, session?: any) {
    try {
      let sender = await new UserService().getById(data.userId, false, session);

      if (!sender)
        sender = await new BotService().getById(data.userId, false, session);

      if (!sender) throw new Error("No sender found");

      const conversationService = new ConversationService();
      const message = await conversationService.addMessage(
        data.userId,
        {
          sender: data.userId,
          sendDate: new Date(),
          conversationId: data.conversationId,
          content: data.message,
          status: MessageStatus.send
        } as IMessage,
        data.conversationId,
        { session }
      );

      chat.to(data.roomId).emit("new message", message);
    } catch (error) {
      let errors = [];
      if (error.message) errors.push(error.message);
      else errors.push("Sending message failed");

      chat.to(data.roomId).emit("failed to send message", {
        errors,
        message: data.message
      });
    }
  }
});

console.log("Done!");

export default chat;

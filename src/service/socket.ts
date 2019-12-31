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
import BotMessageInfo from "../models/socket/BotMessageInfo";
console.log("Initializing sockets...");
const io = require("socket.io")(server);
const chat = io.of("/chat");

chat.on("connection", socket => {
  socket.on("join", (data: SocketUserInfo) => {
    socket.join(data.roomId);
    socket
      .to(data.roomId)
      .emit("user join room", `${data.user.username} join room`);
  });

  socket.on("is typing", (data: SocketUserInfo) => {
    socket.to(data.roomId).emit("user is typing", data.user);
  });

  socket.on("stoped typing", (data: SocketUserInfo) => {
    socket.to(data.roomId).emit("user stoped typing", data.user);
  });

  socket.on("private message", async (data: SocketMessageInfo) => {
    await saveMessage(data);
  });

  socket.on("bot message", async (data: BotMessageInfo) => {
    new TransactionRunner().withTransaction(async () => {
      try {
        await saveMessage(data);

        const botResponse = await new BotService().getBotResponse(
          data.targetBotName,
          data.message
        );
        await saveMessage({
          message: botResponse.message,
          conversationId: data.conversationId,
          roomId: data.roomId,
          userId: botResponse.bot._id
        } as SocketMessageInfo);
      } catch (error) {
        chat.to(data.roomId).emit("failed to send message", {
          error: error,
          message: data.message
        });
      }
    });
  });

  async function saveMessage(data: SocketMessageInfo) {
    const runner = new TransactionRunner();
    const opt = await runner.startSession();
    try {
      runner.startTransaction();

      const sender = await new UserService().getById(
        data.userId,
        false,
        opt.session
      );

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
        opt
      );

      await runner.commitTransaction();
      chat.to(data.roomId).emit("new message", message);
    } catch (error) {
      await runner.abortTransaction();
      runner.endSession();

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

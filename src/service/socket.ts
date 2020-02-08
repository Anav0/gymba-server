import server from "../server";
import {
  MessageStatus,
  IMessage,
  SocketMessageInfo,
  SocketUserInfo,
  SocketBotMessageInfo,
  IInvitation
} from "../models";
import { TransactionRunner } from "./transactionRunner";
import { ConversationService } from "./conversationService";
import { UserService } from "./userService";
import { BotService } from "./botService";
import { ActivityService } from "./activityService";
import SocketNewInvitation from "../models/socket/SocketNewInvitation";
console.log("Initializing sockets...");
const io = require("socket.io")(server);
const chat = io.of("/chat");
const activityService = new ActivityService();

chat.on("connection", socket => {
  const user = socket.handshake.query;

  activityService.changeStatus(user._id, true, socket.id);
  chat.emit("user login", user._id);

  socket.on("disconnect", () => {
    activityService.changeStatus(user._id, false, null);
    chat.emit("user logout", user._id);
  });

  socket.on("friend removed", (data: SocketUserInfo) => {
    chat.to(data.roomId).emit("friend removed", data.user._id);
  });

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

  socket.on("invitation sent", async (invitation: IInvitation) => {
    if (!invitation.target || !invitation.sender) return;

    const activity = await new ActivityService().getByUserId(
      invitation.target,
      "user"
    );

    if (activity.isOnline && activity.socketId)
      socket.to(activity.socketId).emit("new invitation", invitation);
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

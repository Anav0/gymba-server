import {
  IConversation,
  IMessage,
  MessageModel,
  MessageStatus,
  IUser,
  ConversationModel,
  getUserModelPublicInfo
} from "../models";

export interface IConversationService {
  getById(loggedUserId: string, conversationId: string): Promise<IConversation>;
  getByParticipantId(
    userId: string,
    participantId: string,
    maxNumberOfParticipants: number,
    populate?: string
  ): Promise<IConversation[]>;
  getMostRecentMessage(user: IUser): Promise<IMessage>;
  getUnreadMessages(loggedUserId: string, id: string): Promise<IMessage[]>;
  getMessages(id: string): Promise<Array<IMessage>>;
  createConversation(
    model: IConversation,
    transaction: any
  ): Promise<IConversation>;
  addMessage(
    loggedUserId: string,
    model: IMessage,
    conversationId: string,
    transaction: any
  ): Promise<IMessage>;
  removeMessage(messageId: string): Promise<void>;
  updateMessageStatus(
    status: MessageStatus,
    senderId: string,
    messageId: string
  ): Promise<IMessage>;
  getByMessageId(messageId: string): Promise<IConversation>;
}

export class ConversationService implements IConversationService {
  updateMessageStatus(
    status: MessageStatus,
    senderId: string,
    messageId: string
  ): Promise<IMessage> {
    return new Promise(async (resolve, reject) => {
      const message = await MessageModel.findById(messageId).exec();

      if (message.sender.toString() != senderId.toString())
        reject("Only sender of an message can update its status");

      message.status = status;
      await message.save();
      resolve(message);
    });
  }
  getByMessageId(messageId: string): Promise<IConversation> {
    return new Promise(async (resolve, reject) => {
      const conversation = await ConversationModel.findOne({
        messages: messageId
      })
        .populate("participants", getUserModelPublicInfo())
        .exec();

      resolve(conversation);
    });
  }
  getById(
    loggedUserId: string,
    conversationId: string
  ): Promise<IConversation> {
    return ConversationModel.findOne({
      $and: [{ _id: conversationId }, { participants: loggedUserId }]
    })
      .populate("participants", getUserModelPublicInfo())
      .exec();
  }
  getByParticipantId(
    userId: string,
    participantId: string,
    minNumberOfParticipants: number = -1,
    populate?: string
  ): Promise<IConversation[]> {
    return new Promise(async (resolve, reject) => {
      try {
        let conversations = await ConversationModel.find({
          $and: [{ participants: userId }, { participants: participantId }]
        })
          .populate(!populate ? "" : populate)
          .exec();
        conversations = conversations.filter(
          conversation =>
            conversation.participants.length >= minNumberOfParticipants
        );
        resolve(conversations);
      } catch (error) {
        reject(error);
      }
    });
  }

  getMostRecentMessage(user: IUser): Promise<IMessage> {
    return new Promise(async (resolve, reject) => {
      const mostRecentMessage = await MessageModel.findOne({
        conversationId: { $in: user.conversations }
      })
        .sort({ sendDate: -1 })
        .limit(1);

      resolve(mostRecentMessage);
    });
  }
  getUnreadMessages(
    loggedUserId: string,
    conversationId: string
  ): Promise<IMessage[]> {
    return new Promise(async (resolve, reject) => {
      const conversation = await ConversationModel.findById(conversationId);

      if (!conversation) return reject("No conversation with given id found");

      const messages = MessageModel.find({
        $and: [
          { status: "send" },
          {
            sender: { $ne: loggedUserId },
            _id: { $in: conversation.messages }
          }
        ]
      })
        .sort({ sendDate: 1 })
        .exec();

      resolve(messages);
    });
  }
  getMessagesInBetweenDates(
    conversationId: string,
    startDate: string,
    endDate: string
  ): Promise<IMessage[]> {
    return MessageModel.find({
      $and: [
        { _id: { $in: conversationId } },
        { sendDate: { $gte: startDate, $lte: endDate } }
      ]
    })
      .populate("sender", getUserModelPublicInfo())
      .sort({ sendDate: 1 })
      .exec();
  }
  getMessages(conversationId: string): Promise<IMessage[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const conversation = await ConversationModel.findById(conversationId);
        if (!conversation) return reject("No conversation with given id found");
        const messages = await MessageModel.find({
          _id: { $in: conversation.messages }
        })
          .populate("sender", getUserModelPublicInfo())
          .sort({ sendDate: 1 })
          .exec();
        resolve(messages);
      } catch (error) {
        reject(error);
      }
    });
  }
  async createConversation(
    model: any,
    transaction: any
  ): Promise<IConversation> {
    const conversation = new ConversationModel(model);
    return await conversation.save(transaction);
  }
  addMessage(
    loggedUserId: string,
    model: IMessage,
    conversationId: string,
    transaction: any
  ): Promise<IMessage> {
    return new Promise(async (resolve, reject) => {
      try {
        let message = await new MessageModel(model).save(transaction);
        message = await message.populate("sender").execPopulate();
        let conversation = await this.getById(loggedUserId, conversationId);
        if (!conversation) return reject(new Error("Conversation not found"));
        conversation.messages.push(message._id);
        await conversation.save(transaction);
        resolve(message);
      } catch (error) {
        reject(error);
      }
    });
  }
  removeMessage(messageId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

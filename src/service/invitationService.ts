import {
  IInvitation,
  InvitationModel,
  getUserModelPublicInfo
} from "../models";
import { UserService } from "./userService";
import { ConversationService } from "./conversationService";
import uuidv4 from "uuid/v4";
import { TransactionRunner } from "./transactionRunner";
export interface IInvitationService {
  createInvitation(model: IInvitation, transation: any): Promise<IInvitation>;
  acceptInvitation(invitationId: string, userId: string): Promise<void>;
  rejectInvitation(invitationId: string, userId: string): Promise<void>;
  getById(
    invitationId: string,
    userId: string,
    populate: string
  ): Promise<IInvitation>;
  getRecivedInvitations(
    userId: string,
    populate: string
  ): Promise<IInvitation[]>;
  getSentInvitations(userId: string, populate: string): Promise<IInvitation[]>;
  getInvitationInvolving(
    userId: string,
    targetId: string,
    populate: string
  ): Promise<IInvitation>;
  getInvitationsSendOrRecivedByUser(userId: string): Promise<IInvitation[]>;
  getInvitationSendOrRecivedByUser(
    invitationId: string,
    userId: string
  ): Promise<IInvitation>;
}

export class InvitationService implements IInvitationService {
  getById(
    invitationId: string,
    userId: string,
    populate: string
  ): Promise<IInvitation> {
    return InvitationModel.findOne({
      $and: [{ _id: invitationId }, { target: userId }]
    })
      .populate(!populate ? "" : populate, getUserModelPublicInfo())
      .exec();
  }
  getInvitationsSendOrRecivedByUser(userId: string): Promise<IInvitation[]> {
    return InvitationModel.find({
      $or: [{ sender: userId }, { target: userId }]
    }).exec();
  }
  getInvitationSendOrRecivedByUser(
    invitationId: string,
    userId: string
  ): Promise<IInvitation> {
    return InvitationModel.findOne({
      $and: [
        { $or: [{ sender: userId }, { target: userId }] },
        { _id: invitationId }
      ]
    }).exec();
  }
  createInvitation(model: IInvitation, transation: any): Promise<IInvitation> {
    const invitation = new InvitationModel(model);
    return invitation.save(transation);
  }
  acceptInvitation(invitationId: string, userId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const runner = new TransactionRunner();
      const opt = await runner.startSession();

      runner.withTransaction(async () => {
        try {
          const invitation = await this.getById(invitationId, userId, "");

          if (!invitation) return reject(new Error("No invitation found"));

          //Check if user is target of this invitation
          if (userId != invitation.target.toString())
            return reject(
              new Error(
                "You are not target of this invitation so you cannot accept it. Nice try doe"
              )
            );

          const userService = new UserService();

          //find sender and add target to his friends list
          const invitationSender = await userService.getById(
            invitation.sender,
            true
          );

          if (!invitationSender)
            return reject(new Error("Sender no longer exists"));

          //Check if users spoke before
          let conversation = [] as string[];
          let user = await userService.getById(userId, true);

          if (!user) return reject(new Error("No user with given id found"));

          user.conversations.map(id => {
            if (invitationSender.conversations.includes(id))
              return conversation.push(id.toString());
          });

          //If they never spoke before...
          if (!conversation[0]) {
            //Create conversation
            //TODO: make this async
            let foundConversation = await new ConversationService().createConversation(
              {
                roomId: uuidv4(),
                participants: [user._id, invitationSender._id]
              },
              opt
            );

            //add conversation
            user.conversations.push(foundConversation._id);
            invitationSender.conversations.push(foundConversation._id);
          }

          //Add invitation sender to user's friends list
          user.friends.push(invitation.sender);

          //add to friend list
          invitationSender.friends.push(invitation.target);

          //Save target user
          await user.save(opt);

          //save changes
          await invitationSender.save(opt);
          await invitation.remove();
          resolve();
        } catch (error) {
          runner.endSession();
          reject(error);
        }
      });
    });
  }
  rejectInvitation(invitationId: string, userId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      //TODO: think about making transaction middleware
      const runner = new TransactionRunner();
      const opt = await runner.startSession();
      try {
        runner.startTransaction();
        const user = await new UserService().getById(userId);

        if (!user) return reject(new Error("No user with given id found"));

        const invitation = await this.getInvitationSendOrRecivedByUser(
          invitationId,
          userId
        );

        if (!invitation) return reject(new Error("No invitation found"));

        //Check if user is target or sender of this invitation
        if (
          user._id.toString() != invitation.target.toString() &&
          user._id.toString() != invitation.sender.toString()
        )
          return reject(
            new Error(
              "You are not a target nor sender of this invitation so you cannot reject it. Nice try doe"
            )
          );

        //Remove invitation
        //TODO: remove() should cascade then any relaction to object will be removed as well
        await invitation.remove();

        await runner.commitTransaction();
        return resolve();
        //TODO: thing about i18n, maybe passing lang param will do the trick
      } catch (error) {
        console.error(error);
        await runner.abortTransaction();
        runner.endSession();
        return reject(error);
      }
    });
  }
  getRecivedInvitations(
    userId: string,
    populate: string
  ): Promise<IInvitation[]> {
    return InvitationModel.find({
      target: userId
    })
      .populate(!populate ? "" : populate)
      .exec();
  }
  getSentInvitations(userId: string, populate: string): Promise<IInvitation[]> {
    return InvitationModel.find({
      sender: userId
    })
      .populate(!populate ? "" : populate)
      .exec();
  }
  getInvitationInvolving(
    userId: string,
    targetId: string,
    populate: string
  ): Promise<IInvitation> {
    return InvitationModel.findOne({
      $or: [
        { $and: [{ sender: userId }, { target: targetId }] },
        { $and: [{ sender: targetId }, { target: userId }] }
      ]
    })
      .populate(!populate ? "" : populate, getUserModelPublicInfo())
      .exec();
  }
}
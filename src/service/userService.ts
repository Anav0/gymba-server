import { IUser, UserModel, getUserModelPublicInfo } from "../models";
import { InvitationService } from "./invitationService";

export interface IUserService {
  getListOfSuggestedFriends(user: IUser): Promise<IUser[]>;
  getById(id: string, session: any): Promise<IUser>;
  getByEmail(
    email: string,
    getPrivateInfo: boolean,
    session?: any
  ): Promise<IUser>;
  getByUsername(username: string): Promise<IUser>;
  getUsers(getPrivateInfo: boolean, session?: any): Promise<IUser[]>;
  getUsersAndBots(getPrivateInfo: boolean, session?: any): Promise<IUser[]>;
  create(model: IUser, transation: any): Promise<IUser>;
  update(id: string, model: IUser, transation: any): Promise<IUser>;
  remove(id: string): Promise<void>;
}

export class UserService implements IUserService {
  getListOfSuggestedFriends(user: IUser): Promise<IUser[]> {
    return new Promise(async (resolve, reject) => {
      const invitations = await new InvitationService().getInvitationsSendOrRecivedByUser(
        user._id
      );
      let ids = invitations.map(invite => invite.target);
      ids.push(...invitations.map(invite => invite.sender));
      const users = await UserModel.find(
        {
          $and: [
            { _id: { $ne: user._id } },
            { _id: { $nin: ids } },
            { _id: { $nin: user.friends } }
          ]
        },
        getUserModelPublicInfo()
      ).exec();

      return resolve(users);
    });
  }

  getUsersAndBots(
    getPrivateInfo: boolean = false,
    session?: any
  ): Promise<IUser[]> {
    let query = UserModel.find({});

    if (!getPrivateInfo) query = query.select(getUserModelPublicInfo());
    if (session) query = query.session(session);

    return query.exec();
  }

  getUsers(getPrivateInfo: boolean = false, session?: any): Promise<IUser[]> {
    let query = UserModel.find({ isBot: false });

    if (!getPrivateInfo) query = query.select(getUserModelPublicInfo());
    if (session) query = query.session(session);

    return query.exec();
  }
  getByUsername(
    username: string,
    getPrivateInfo: boolean = false
  ): Promise<IUser> {
    return UserModel.findOne({ username, isBot: false })
      .select(getPrivateInfo ? "" : getUserModelPublicInfo())
      .exec();
  }
  getById(
    id: string,
    getPrivateInfo: boolean = false,
    session?: any
  ): Promise<IUser> {
    let query = UserModel.findOne({ _id: id, isBot: false });

    if (!getPrivateInfo) query = query.select(getUserModelPublicInfo());
    if (session) query = query.session(session);

    return query.exec();
  }
  getByEmail(
    email: string,
    getPrivateInfo: boolean = false,
    session?: any
  ): Promise<IUser> {
    let query = UserModel.findOne({ email, isBot: false });
    if (!getPrivateInfo) query = query.select(getUserModelPublicInfo());
    if (session) query = query.session(session);
    return query.exec();
  }
  async create(model: IUser, transation: any): Promise<IUser> {
    model.isBot = false;
    return new UserModel(model).save();
  }
  async update(id: string, model: IUser, transaction?: any): Promise<IUser> {
    model.isBot = false;
    let query = UserModel.findById(id);
    if (transaction) query = query.session(transaction.session);
    let user = await query.exec();
    user = model;
    return user.save();
  }
  remove(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        let user = await UserModel.findById({ id, isBot: false }).exec();
        user.remove();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  }
}

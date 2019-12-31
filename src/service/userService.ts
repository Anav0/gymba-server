import { IUser, UserModel, getUserModelPublicInfo } from "../models";
import { InvitationService } from "./invitationService";

export interface IUserService {
  getListOfSuggestedFriends(user: IUser): Promise<IUser[]>;
  getById(id: string, session: any): Promise<IUser>;
  getByEmail(email: string): Promise<IUser>;
  getByUsername(username: string): Promise<IUser>;
  getUsers(): Promise<IUser[]>;
  create(model: IUser): Promise<IUser>;
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

  getUsers(): Promise<IUser[]> {
    return UserModel.find({}, getUserModelPublicInfo()).exec();
  }
  getByUsername(
    username: string,
    getPrivateInfo: boolean = false
  ): Promise<IUser> {
    return UserModel.findOne({ username })
      .select(getPrivateInfo ? "" : getUserModelPublicInfo())
      .exec();
  }
  getById(
    id: string,
    getPrivateInfo: boolean = false,
    session?: any
  ): Promise<IUser> {
    let query = UserModel.findOne({ _id: id });

    if (!getPrivateInfo) query = query.select(getUserModelPublicInfo());
    if (session) query = query.session(session);

    return query.exec();
  }
  getByEmail(email: string): Promise<IUser> {
    return UserModel.findOne({ email })
      .select(getUserModelPublicInfo())
      .exec();
  }
  async create(model: IUser): Promise<IUser> {
    const user = new UserModel(model);
    return user.save();
  }
  update(id: string, model: IUser, transation: any): Promise<IUser> {
    return new Promise(async (resolve, reject) => {
      try {
        let user = await UserModel.findById(id).exec();
        user = model;
        user.save(transation);
        return resolve(user);
      } catch (error) {
        return reject(error);
      }
    });
  }
  remove(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        let user = await UserModel.findById(id).exec();
        user.remove();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  }
}

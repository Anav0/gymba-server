import { IUser, UserModel, getUserModelPublicInfo } from "../models";
import axios from "axios";

export class BotResponse {
  message: string;
  bot: IUser;

  constructor(message: string, bot: IUser) {
    this.message = message;
    this.bot = bot;
  }
}

export interface IBotService {
  getById(id: string, getPrivateInfo: boolean, session?: any): Promise<IUser>;
  getAll(session?: any): Promise<Array<IUser>>;
  getBotResponse(
    botId: string,
    message: string,
    session?: any
  ): Promise<BotResponse>;
  create(model: IUser, transation: any): Promise<IUser>;
}

export class BotService implements IBotService {
  getById(
    id: string,
    getPrivateInfo: boolean = false,
    session?: any
  ): Promise<IUser> {
    let query = UserModel.findOne({ _id: id, isBot: true });

    if (!getPrivateInfo) query = query.select(getUserModelPublicInfo());
    if (session) query = query.session(session);

    return query.exec();
  }
  getAll(session?: any, getPrivateInfo: boolean = false): Promise<IUser[]> {
    let query = UserModel.find({ isBot: true });
    if (!getPrivateInfo) query = query.populate(getUserModelPublicInfo());
    if (session) query = query.session(session);
    return query.exec();
  }
  getBotResponse(
    botId: string,
    message: string,
    session?: any
  ): Promise<BotResponse> {
    return new Promise(async (resolve, reject) => {
      const bot = await this.getById(botId, false, session);
      //TODO: temperary bot response
      const { data: response } = await axios.get(
        `${process.env.BOT_URL}?message=${message}`
      );
      resolve(new BotResponse(response, bot));
    });
  }
  update(id: string, model: IUser, transation: any): Promise<IUser> {
    return new Promise(async (resolve, reject) => {
      try {
        model.isBot = true;
        let user = await this.getById(id);
        user = model;
        user.save(transation);
        return resolve(user);
      } catch (error) {
        return reject(error);
      }
    });
  }
  async create(model: IUser, transation: any): Promise<IUser> {
    model.isBot = true;
    const user = new UserModel(model);
    return user.save(transation);
  }
}

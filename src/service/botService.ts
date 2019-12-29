import { IBot, IUser, BotModel, getBotModelPublicInfo } from "../models";

export class BotResponse {
  message: string;
  bot: IBot;
  to: IUser;

  constructor(message: string, bot: IBot, to: IUser) {
    this.message = message;
    this.bot = bot;
    this.to = to;
  }
}

export interface IBotService {
  getById(id: string): Promise<IBot>;
  getAll(): Promise<Array<IBot>>;
  getBotResponse(name: string, message: string): Promise<BotResponse>;
}

export class BotService implements IBotService {
  getById(id: string): Promise<IBot> {
    return BotModel.findById(id, getBotModelPublicInfo()).exec();
  }
  getAll(): Promise<IBot[]> {
    return BotModel.find({}, getBotModelPublicInfo()).exec();
  }
  getBotResponse(name: string, message: string): Promise<BotResponse> {
    throw new Error("Method not implemented.");
  }
}

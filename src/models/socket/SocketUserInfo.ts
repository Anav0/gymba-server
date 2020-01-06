import { IUser } from "../user";

export default class SocketUserInfo {
  readonly user: IUser;
  readonly roomId: string;
}

import { ActivityModel, IActivity } from "../models/activity";

export interface IActivityService {
  getByUserId(userId: string, populate?: string): Promise<IActivity>;
  changeStatus(
    userId: string,
    isOnline: boolean,
    socketId: string
  ): Promise<IActivity>;
  getActiveUsersIds(): Promise<string[]>;
}

export class ActivityService implements IActivityService {
  async getActiveUsersIds(): Promise<string[]> {
    const activities = await ActivityModel.find({ isOnline: true }).exec();
    return activities.map(activity => activity.user);
  }
  private create(model: IActivity): Promise<IActivity> {
    return new Promise((resolve, reject) => {
      try {
        return new ActivityModel(model).save();
      } catch (error) {
        reject(error);
      }
    });
  }

  async changeStatus(
    userId: string,
    isOnline: boolean,
    socketId: string
  ): Promise<IActivity> {
    return new Promise(async (resolve, reject) => {
      try {
        const activity = await this.getByUserId(userId);

        if (!activity) {
          const activity = await this.create({
            isOnline,
            user: userId,
            socketId
          } as IActivity);

          return resolve(activity);
        } else {
          activity.isOnline = isOnline;
          activity.socketId = socketId;
          return resolve(activity.save());
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  getByUserId(userId: string, populate?: string): Promise<IActivity> {
    return ActivityModel.findOne({ user: userId })
      .populate(populate ? populate : "")
      .exec();
  }
}

import MongoStore from "connect-mongo";
import session, { Store } from "express-session";
import mongoose from "mongoose";

export interface IDbService {
  connect(): any;
  getStore(): Store;
}

export class MongoDbService implements IDbService {
  async connect(): Promise<mongoose.Mongoose> {
    return mongoose.connect(
      process.env.MONGO_CONNECTION_STRING,
      {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
        useUnifiedTopology: true
      },
      error => {
        if (error) throw error;
      }
    );
  }
  getStore(): MongoStore.MongoStore {
    const store = MongoStore(session);
    return new store({ mongooseConnection: mongoose.connection });
  }
}

import mongoose from "mongoose";

export class TransactionRunner {
  session = null;
  async startSession(): Promise<any> {
    const session = await mongoose.startSession();
    this.session = session;
    return { session };
  }
  async withTransaction(functionToPerform: Function) {
    if (this.isSessionStarted())
      await this.session.withTransaction(session => functionToPerform(session));
  }
  startTransaction() {
    if (this.isSessionStarted()) this.session.startTransaction();
  }
  async commitTransaction() {
    if (this.isSessionStarted()) await this.session.commitTransaction();
  }
  async abortTransaction() {
    if (this.isSessionStarted()) await this.session.abortTransaction();
  }
  async endSession() {
    if (this.isSessionStarted()) this.session.endSession();
  }

  private isSessionStarted(): boolean {
    if (!this.session) throw new Error("Session is not started");
    return true;
  }
}

import {
  IVerification,
  VerificationModel,
  Verification
} from "../models/verification";

export interface IVerificationService {
  getById(id: string, session?: any): Promise<IVerification>;
  getByUser(userId: string, session?: any): Promise<IVerification>;
  create(model: IVerification, session?: any): Promise<IVerification>;
  update(
    verificationId: string,
    model: IVerification,
    session?: any
  ): Promise<IVerification>;
}

export class VerificationService implements IVerificationService {
  getById(id: string, session?: any): Promise<IVerification> {
    let query = VerificationModel.findById(id);
    if (session) query = query.session(session);
    return query.exec();
  }
  getByUser(userId: string, session?: any): Promise<IVerification> {
    let query = VerificationModel.findOne({ user: userId });
    if (session) query = query.session(session);
    return query.exec();
  }
  create(model: IVerification, session?: any): Promise<IVerification> {
    let verification = new VerificationModel(model);
    if (session) return verification.save({ session });
    return verification.save();
  }
  update(
    verificationId: string,
    model: IVerification,
    session?: any
  ): Promise<IVerification> {
    let query = VerificationModel.updateOne({ _id: verificationId }, model);
    if (session) query = query.session(session);
    return query.exec();
  }
  remove(id: string, session?: any): Promise<any> {
    let query = VerificationModel.deleteOne({ _id: id });
    if (session) query = query.session(session);
    return query.exec();
  }
}

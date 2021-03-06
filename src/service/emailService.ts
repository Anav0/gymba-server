require("dotenv").config();
import sender from "@sendgrid/mail";
import { MailData } from "@sendgrid/helpers/classes/mail";

export default class EmailService {
  async sendEmail(
    to: string,
    from: string,
    subject: string,
    content: string,
    contentHTML: string
  ) {
    return await new SendGridEmailSender().sendEmail(
      to,
      from,
      subject,
      content,
      contentHTML
    );
  }

  async sendTemplateEmail(
    to: string,
    from: string,
    subject: string,
    templateId: string,
    emailData: object
  ) {
    return await new SendGridEmailSender().sendTemplateEmail(
      to,
      from,
      subject,
      templateId,
      emailData
    );
  }
}

interface EmailSender {
  sendEmail(
    to: string,
    from: string,
    subject: string,
    content: string,
    contentHTML: string
  ): Promise<any>;
}

class SendGridEmailSender implements EmailSender {
  constructor() {
    sender.setApiKey(process.env.SENDGRID_API_KEY);
  }
  sendEmail(
    to: string,
    from: string,
    subject: string,
    content: string,
    html: string
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const msg = {
          to: {
            email: to
          },
          from: {
            email: from
          },
          subject,
          content: [
            {
              type: "text/plain",
              value: content
            }
          ],
          html
        };
        await sender.send(msg as MailData, false);
        resolve();
      } catch (error) {
        //if (error.response.body) console.log(error.response.body);
        reject(error);
      }
    });
  }
  sendTemplateEmail(
    to: string,
    from: string,
    subject: string,
    templateId: string,
    emailData: object
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        const msg = {
          to,
          from,
          subject,
          templateId,
          dynamicTemplateData: emailData
        };
        const response = await sender.send(msg as MailData, true);
        resolve(response);
      } catch (error) {
        if (error.response.body) console.log(error.response.body);
        console.log(error);
        reject(error);
      }
    });
  }
}

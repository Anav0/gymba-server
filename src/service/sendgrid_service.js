require("dotenv").config();
const sender = require("@sendgrid/mail");

sender.setApiKey(process.env.SENDGRID_API_KEY);
var mode = process.env.NODE_ENV || "dev";

export function sendMessage(to, from, subject, text, html) {
  return new Promise(async (resolve, reject) => {
    try {
      const msg = {
        to: to,
        from: from,
        subject: subject,
        text: text,
        html: html
      };

      if (mode == "dev") {
        resolve("Email was not send becouse you are in dev mode")
      }
      const sendResults = await sender.send(msg, false);
      resolve(sendResults);

    }
    catch (err) {
      reject(err);
    }
  });
}


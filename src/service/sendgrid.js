require("dotenv").config();
const sender = require("@sendgrid/mail");

sender.setApiKey(process.env.SENDGRID_API_KEY);

export function sendMessage(to, from, subject, text, html) {
  return new Promise(async (resolve, reject) => {
    try {
      const msg = {
        to,
        from,
        subject,
        text,
        html
      };
      const sendResults = await sender.send(msg, false);
      resolve(sendResults);
    }
    catch (error) {
      reject(error);
    }
  });
}


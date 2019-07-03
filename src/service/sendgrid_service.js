require("dotenv").config();
const sender = require("@sendgrid/mail");

sender.setApiKey(process.env.SENDGRID_API_KEY);
var mode = process.env.NODE_ENV || "dev";

export function sendMessage(to, from, subject, text, html, callback) {
  const msg = {
    to: to,
    from: from,
    subject: subject,
    text: text,
    html: html
  };

  if (mode == "dev") {
    return callback(null, "Email was not send becouse you are in dev mode");
  }
  sender.send(msg, false, (err, result) => {
    return callback(err, result);
  });
}

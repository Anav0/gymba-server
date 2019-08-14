
import * as sendgrid from "../service/sendgrid";

export const setupOpinionEndpoints = (app) => {
    app.post("/opinion", async (req, res) => {
        try {
            let errors = [];
            if (!req.body.opinion.sender)
                errors.push("No sender specified")

            if (!req.body.opinion.content)
                errors.push("No content specified")

            if (errors.length > 0)
                return res.status(400).json({ errors: errors })

            await sendgrid.sendMessage(process.env.MY_EMAIL, req.body.opinion.sender, "Gymba opinion", req.body.opinion.content, `<p>${req.body.opinion.content}</p>`)
            res.status(200).send("Message send successfully");
        } catch (err) {
            console.error(err)
            res.status(400).send({ errors: [err.message] });
        }
    });
}
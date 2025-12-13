const nodemailer = require("nodemailer");

let transporter = null;

function init() {
    transporter = nodemailer.createTransport({
        service: "yahoo",
        auth: {
            user: SECRETS.NODE_MAILER_EMAIL,
            pass: SECRETS.NODE_MAILER_PASSWORD
        }
    });
}

function sendMail(dstEmail) {
    transporter.sendMail({
        to: dstEmail,
        from: `Raven Drives <${SECRETS.NODE_MAILER_EMAIL}>`,
        subject: "Raven Drives - Account Confirmation",
        html: "<h1>This is sample</h1>"
    }).then(console.log)
}

module.exports = {
    init,
    sendMail
};
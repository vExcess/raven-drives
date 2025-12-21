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

function sendEmailConfirmation(dstEmail, code) {
    transporter.sendMail({
        to: dstEmail,
        from: `Raven Drives <${SECRETS.NODE_MAILER_EMAIL}>`,
        subject: "Raven Drives - Account Confirmation",
        html: `
            <h1>Confirm Raven Drives Email Address</h1>
            
            <p>
                Thank you for using Raven Drives!
                <br><br>
                Please confirm your email address by navigating to: <a href="https://ravendrives.org/confirm_email?code=${code}">https://ravendrives.org/confirm_email?code=${code}</a> .
                <br><br>
                Alternatively, you can manually copy your code below:
                <br>
                <h2>${code}</h2>
                If you did not attempt to sign up for Raven Drives, you can ignore this email. Your account won't be activated unless you confirm your email address.
                <br><br>
                ps. Yes, I know this looks very not legit. There's not much I can do about it without Benedictine giving us a dedicated email address.
            </p>
        `
    }).then(console.log)
}

/*
const Mailjet = require('node-mailjet');

let mailjet = null;

function connectToMailjet() {
    mailjet = Mailjet.apiConnect(
        SECRETS.MAILJET_KEY,
        SECRETS.MAILKEY_SECRET
    );
}

function sendUserConfirmationEmail(email, code, domain) {
    mailjet
        .post('send', { version: 'v3.1' })
        .request({
            Messages: [
                {
                    From: {
                        Email: "darkphoton31@gmail.com",
                        Name: "Raven Drives Account Confirmation"
                    },
                    To: [
                        {
                            Email: email,
                            // Name: "passenger 1"
                        }
                    ],
                    Subject: "Confirm Raven Drives email address",
                    TextPart: "",
                    HTMLPart: `
                        <h1>Confirm Raven Drives email address</h1>
                        <p>
                            Thank you for using Raven Drives!
                            <br><br>
                            Please confirm your email address by navagating to: 
                            <a href='http://${domain}/confirm_email/${code}'>RavenDrives.org/confirm_email/${code}</a>.
                            <p>This is a one time confirmation.</p>
                            <br>
                            <p>
                                In Christ,
                                <br><br>
                                Jared Gleisner 
                                <br>
                                If you did not attempt to sign up for Raven Drives, simply ignore this email, your account will not be created unless you confirm it here.
                                <br>
                                ps. Yes, I know this looks very not legit, there's not much I can do about it without spending lots of money on Azure or a Google Buisness email.
                            </p>
                        </p>
                    `
                }
            ]
        })
        .then((result) => {
            console.log(result.body)
        })
        .catch((err) => {
            console.log(err.statusCode)
        });
}
*/

module.exports = {
    init,
    sendEmailConfirmation
};
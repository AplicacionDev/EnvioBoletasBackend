const nodemailer = require("nodemailer");
const path = require("path");
const { MailService } = require("../../domain/services/MailService");
const { envs } = require("../../config/envs");

class SmtpMailService extends MailService {
  constructor() {
    super();
    this.transporter = nodemailer.createTransport({
      host: envs.SMTP_HOST,
      port: envs.SMTP_PORT,
      secure: false,
      auth: {
        user: envs.SMTP_USER,
        pass: envs.SMTP_PASSWORD,
      },
      tls: {
        minVersion: "TLSv1.2",
      },
    });
  }

  async sendMail(htmlBody, asunto, destinatario, filePath) {
    return this.sendMailSmtp(htmlBody, asunto, destinatario, filePath);
  }

  async sendMailSmtp(htmlBody, asunto, destinatario, filePath) {
    if (!destinatario) return;

    const mailOptions = {
      from: envs.SMTP_FROM,
      to: destinatario,
      subject: asunto,
      html: htmlBody,
      attachments: [
        {
          filename: path.basename(filePath),
          path: filePath,
        },
      ],
    };

    await this.transporter.sendMail(mailOptions);
  }
}

module.exports = { SmtpMailService };

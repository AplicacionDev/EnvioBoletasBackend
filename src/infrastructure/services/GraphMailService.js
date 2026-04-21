const fs = require("fs");
const path = require("path");
const { MailService } = require("../../domain/services/MailService");
const { envs } = require("../../config/envs");

class GraphMailService extends MailService {
  constructor() {
    super();
    this._token = null;
    this._tokenExpiresAt = 0;
  }

  async sendMail(htmlBody, asunto, destinatario, filePath) {
    return this.sendMailGraph(htmlBody, asunto, destinatario, filePath);
  }

  async sendMailGraph(htmlBody, asunto, destinatario, filePath) {
    if (!destinatario) return;

    console.log(`[GraphMail] Obteniendo token...`);
    const token = await this.#getToken();
    console.log(`[GraphMail] Token obtenido. Preparando correo para ${destinatario}...`);

    const pdfBytes = fs.readFileSync(filePath);
    const base64Pdf = pdfBytes.toString("base64");
    console.log(`[GraphMail] PDF adjunto: ${path.basename(filePath)} (${pdfBytes.length} bytes)`);

    const emailPayload = {
      message: {
        subject: asunto,
        importance: "normal",
        body: {
          contentType: "HTML",
          content: htmlBody,
        },
        toRecipients: [
          {
            emailAddress: { address: destinatario.trim() },
          },
        ],
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: path.basename(filePath),
            contentType: "application/pdf",
            contentBytes: base64Pdf,
          },
        ],
      },
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${envs.GRAPH_SEND_AS}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[GraphMail] Error ${response.status}: ${errorBody}`);
      const err = new Error(`Graph API error: ${response.status} - ${errorBody}`);
      err.status = response.status;
      const retryAfterHeader = response.headers.get("Retry-After");
      if (retryAfterHeader) err.retryAfter = Number(retryAfterHeader);
      throw err;
    }

    console.log(`[GraphMail] Correo enviado exitosamente a ${destinatario} (status: ${response.status})`);
  }

  async #getToken() {
    if (this._token && Date.now() < this._tokenExpiresAt) {
      return this._token;
    }

    const url = `https://login.microsoftonline.com/${envs.GRAPH_TENANT_ID}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: envs.GRAPH_CLIENT_ID,
      scope: "https://graph.microsoft.com/.default",
      client_secret: envs.GRAPH_CLIENT_SECRET,
      grant_type: "client_credentials",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    this._token = data.access_token;
    // Refresca 5 minutos antes de que expire
    this._tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

    return this._token;
  }
}

module.exports = { GraphMailService };

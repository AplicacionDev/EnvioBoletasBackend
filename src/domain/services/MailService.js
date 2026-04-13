/**
 * @abstract
 * Interfaz para el servicio de envío de correo.
 * Equivalente a la clase Mail de C#.
 */
class MailService {
  /**
   * Envía correo vía SMTP con archivo adjunto.
   * @param {string} htmlBody - Contenido HTML del correo
   * @param {string} asunto - Asunto del correo
   * @param {string} destinatario - Email del destinatario
   * @param {string} filePath - Ruta del archivo adjunto (PDF)
   */
  async sendMailSmtp(htmlBody, asunto, destinatario, filePath) {
    throw new Error("Method not implemented");
  }

  /**
   * Envía correo vía Microsoft Graph API con archivo adjunto.
   * @param {string} htmlBody - Contenido HTML del correo
   * @param {string} asunto - Asunto del correo
   * @param {string} destinatario - Email del destinatario
   * @param {string} filePath - Ruta del archivo adjunto (PDF)
   */
  async sendMailGraph(htmlBody, asunto, destinatario, filePath) {
    throw new Error("Method not implemented");
  }
}

module.exports = { MailService };

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

class PdfService {
  constructor() {
    this._browser = null;
  }

  async #getBrowser() {
    if (!this._browser || !this._browser.connected) {
      this._browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this._browser;
  }

  /**
   * Convierte HTML string a PDF y lo guarda en outputPath.
   * Reemplazo directo de wkhtmltopdf.exe
   */
  async htmlToPdf(htmlContent, outputPath) {
    const browser = await this.#getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      await page.pdf({
        path: outputPath,
        format: "Letter",
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
      });
    } finally {
      await page.close();
    }
  }

  /**
   * Convierte un archivo HTML en disco a PDF.
   */
  async htmlFileToPdf(htmlPath, outputPath) {
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");
    await this.htmlToPdf(htmlContent, outputPath);
  }

  /**
   * Lee el PDF generado como Buffer (para guardar en BD).
   */
  readPdfBuffer(pdfPath) {
    return fs.readFileSync(pdfPath);
  }

  async close() {
    if (this._browser) {
      await this._browser.close();
      this._browser = null;
    }
  }
}

module.exports = { PdfService };

const fs = require("fs");
const path = require("path");

const LOGOS = {
  PRODUCTOS: "PRALCASA.png",
  ADVERT: "ADVERT_TALENT.png",
  ALIMENTI: "ALIMENTI.png",
  MAQUSA: "MAQUSA_RENT.png",
  ALTO: "ALTOPLAST.png",
  DISALTO: "DISALTO.png",
  SALINAS: "SALINAS_MINERVA.png",
};

class BoletaTemplateService {
  constructor() {
    this.templatePath = path.join(process.cwd(), "boleta.html");
    this.tempDir = path.join(process.cwd(), "Temp");
    this.imagesDir = path.join(process.cwd(), "Images");
    this.#ensureTempDir();
  }

  #ensureTempDir() {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true });
    }
    fs.mkdirSync(this.tempDir, { recursive: true });
  }

  getLogoEmpresa(nombreEmpresa) {
    if (!nombreEmpresa) return "";

    for (const [key, logo] of Object.entries(LOGOS)) {
      if (nombreEmpresa.toUpperCase().includes(key)) {
        const logoPath = path.join(this.imagesDir, logo);
        if (fs.existsSync(logoPath)) {
          const base64 = fs.readFileSync(logoPath).toString("base64");
          const ext = path.extname(logo).slice(1);
          return `data:image/${ext};base64,${base64}`;
        }
        return "";
      }
    }
    return "";
  }

  generarHtml({
    empresa,
    nitEmpresa,
    logoEmpresa,
    empleado,
    cargo,
    departamento,
    fechaImpresion,
    rangoPeriodo,
    area,
    liquidoARecibir,
    cantidadLetras,
    nitEmpleado,
    noBoleta,
    detalleHtml,
    nombreBoleta,
  }) {
    let html = fs.readFileSync(this.templatePath, "utf-8");

    const replacements = {
      "{{Empresa}}": empresa || "",
      "{{NitEmpresa}}": nitEmpresa || "",
      "{{LogoEmpresa}}": logoEmpresa || "",
      "{{Empleado}}": empleado || "",
      "{{Cargo}}": cargo || "",
      "{{Departamento}}": departamento || "",
      "{{FechaImpresion}}": fechaImpresion ? fechaImpresion.toString() : "",
      "{{RangoPeriodo}}": rangoPeriodo || "",
      "{{Area}}": area || "",
      "{{LiquidoARecibir}}": liquidoARecibir || "",
      "{{CantidadLetras}}": cantidadLetras || "",
      "{{NitEmpleado}}": nitEmpleado || "",
      "{{NoBoleta}}": noBoleta || "",
      "{{DetalleHTML}}": detalleHtml || "",
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.replaceAll(placeholder, value);
    }

    const htmlPath = path.join(this.tempDir, `${nombreBoleta}.html`);
    fs.writeFileSync(htmlPath, html, "utf-8");

    return html;
  }

  getTempPdfPath(nombreBoleta) {
    return path.join(this.tempDir, `${nombreBoleta}.pdf`);
  }

  getTempHtmlPath(nombreBoleta) {
    return path.join(this.tempDir, `${nombreBoleta}.html`);
  }
}

module.exports = { BoletaTemplateService };

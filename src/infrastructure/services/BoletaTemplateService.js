const fs = require("fs");
const path = require("path");

const LOGOS = {
  PRODUCTOS: "PRALCASA.png",
  ADVERT: "ADVERT_TALENT.png",
  ALIMENTI: "ALIMENTI.png",
  MAQUSA: "MAQUSA_RENT.png",
  DISALTO: "DISALTO.png",
  ALTOPLAST: "ALTOPLAST.png",
  SALINAS: "SALINAS_MINERVA.png",
};

const TEMPLATES = {
  PRODUCTOS: "boleta-pralcasa.html",
  ADVERT: "boleta-advert.html",
  ALIMENTI: "boleta-alimenti.html",
  DISALTO: "boleta-disalto.html",
  ALTOPLAST: "boleta-altoplast.html",
  MAQUSA: "boleta-maqusa.html",
  SALINAS: "boleta-salinas.html",
};

class BoletaTemplateService {
  constructor() {
    this.templatesDir = path.join(process.cwd(), "templates");
    this.tempDir = path.join(process.cwd(), "Temp");
    this.imagesDir = path.join(process.cwd(), "public", "images");
    this.#ensureTempDir();
  }

  #ensureTempDir() {
    if (fs.existsSync(this.tempDir)) {
      // Clear contents without removing the directory itself (fails on Docker volume mounts)
      for (const entry of fs.readdirSync(this.tempDir)) {
        fs.rmSync(path.join(this.tempDir, entry), { recursive: true, force: true });
      }
    } else {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
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

  getTemplatePath(nombreEmpresa) {
    if (nombreEmpresa) {
      for (const [key, template] of Object.entries(TEMPLATES)) {
        if (nombreEmpresa.toUpperCase().includes(key)) {
          const tplPath = path.join(this.templatesDir, template);
          if (fs.existsSync(tplPath)) return tplPath;
        }
      }
    }
    return path.join(this.templatesDir, "boleta-pralcasa.html");
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
    const templatePath = this.getTemplatePath(empresa);
    let html = fs.readFileSync(templatePath, "utf-8");

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

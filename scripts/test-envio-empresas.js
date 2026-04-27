/**
 * Script de prueba: genera una boleta PDF por cada empresa y la envía
 * al correo jeremytello27@gmail.com con datos ficticios.
 *
 * Ejecutar:  node scripts/test-envio-empresas.js
 */
require("dotenv").config();

const { BoletaTemplateService } = require("../src/infrastructure/services/BoletaTemplateService");
const { PdfService } = require("../src/infrastructure/services/PdfService");
const { GraphMailService } = require("../src/infrastructure/services/GraphMailService");
const { SmtpMailService } = require("../src/infrastructure/services/SmtpMailService");
const { envs } = require("../src/config/envs");

const DESTINATARIO = "jlopez@productosbyb.com";

const EMPRESAS = [
  { empresa: "Productos Alimenticios Centroamericanos, S.A.",  nit: "123456-7" },
  { empresa: "Advert Talent, S.A.",                            nit: "234567-8" },
  { empresa: "Alimenti, S.A.",                                 nit: "345678-9" },
  { empresa: "Altoplast, S.A.",                                nit: "456789-0" },
  { empresa: "Disalto, S.A.",                                  nit: "567890-1" },
  { empresa: "Maqusa Rent, S.A.",                              nit: "678901-2" },
  { empresa: "Salinas y Minerva, S.A.",                        nit: "789012-3" },
];

const EMPRESA_ALIASES = {
  "Productos Alimenticios Centroamericanos, S.A.": ["pralcasa", "productos"],
  "Advert Talent, S.A.": ["advert"],
  "Alimenti, S.A.": ["alimenti"],
  "Altoplast, S.A.": ["altoplast"],
  "Disalto, S.A.": ["disalto"],
  "Maqusa Rent, S.A.": ["maqusa"],
  "Salinas y Minerva, S.A.": ["salinas", "minerva"],
};

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getEmpresaFiltroArg() {
  const arg = process.argv.find((a) => a.startsWith("--empresa="));
  if (!arg) return null;
  return arg.split("=")[1]?.trim() || null;
}

function getDelayMsArg() {
  const arg = process.argv.find((a) => a.startsWith("--delay-ms="));
  if (!arg) return 3000;

  const value = Number(arg.split("=")[1]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("--delay-ms debe ser un numero mayor o igual a 0");
  }

  return Math.floor(value);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DETALLE_HTML = `
<table>
  <thead>
    <tr>
      <th colspan="3">Detalle de pago</th>
    </tr>
    <tr>
      <th>Tipo Movimiento</th>
      <th>Ingresos (+)</th>
      <th>Deducciones (-)</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Salario Ordinario</td><td>7,625.00</td><td></td></tr>
    <tr><td>Bonificación Incentivo</td><td>125.00</td><td></td></tr>
    <tr><td>IGSS Retención Empleado</td><td></td><td>-368.29</td></tr>
    <tr><td>ISR</td><td></td><td>-129.09</td></tr>
    <tr><td>Descuento Calzado Industrial</td><td></td><td>-72.00</td></tr>
    <tr><td>Préstamo Personal</td><td></td><td>-500.00</td></tr>
    <tr><td>Seguro de Vida</td><td></td><td>-45.00</td></tr>
    <tr><td>Descuento Comedor</td><td></td><td>-150.00</td></tr>
    <tr><td>Cuota Sindical</td><td></td><td>-25.00</td></tr>
    <tr><td>Anticipo de Salario</td><td></td><td>-200.00</td></tr>
    <tr><td>TOTALES</td><td>7,750.00</td><td>-1,489.38</td></tr>
  </tbody>
</table>`;

async function main() {
  const templateService = new BoletaTemplateService();
  const pdfService = new PdfService();
  const mailService = envs.MAIL_PROVIDER === "graph" ? new GraphMailService() : new SmtpMailService();
  console.log(`[Test] Proveedor: ${envs.MAIL_PROVIDER}`);
  const enviarReal = process.argv.includes("--enviar");
  const delayMs = getDelayMsArg();

  const filtroEmpresa = getEmpresaFiltroArg();
  const empresasAProcesar = filtroEmpresa
    ? EMPRESAS.filter(({ empresa }) => {
        const filtro = normalizar(filtroEmpresa);
        const nombre = normalizar(empresa);
        const aliases = (EMPRESA_ALIASES[empresa] || []).map(normalizar);
        return nombre.includes(filtro) || aliases.some((a) => a.includes(filtro));
      })
    : EMPRESAS;

  if (filtroEmpresa && empresasAProcesar.length === 0) {
    throw new Error(`No se encontro empresa para el filtro --empresa=${filtroEmpresa}`);
  }

  console.log(`\n=== Test de envío de boletas – ${empresasAProcesar.length} empresa(s) ===\n`);
  console.log(`Modo envio: ${enviarReal ? "REAL" : "SIMULACION"}`);
  console.log(`Delay entre correos: ${delayMs} ms\n`);
  if (filtroEmpresa) {
    console.log(`Filtro aplicado: --empresa=${filtroEmpresa}\n`);
  }

  for (let i = 0; i < empresasAProcesar.length; i++) {
    const { empresa, nit } = empresasAProcesar[i];
    const nombreBoleta = `TEST_${Date.now()}_${i}`;
    const logo = templateService.getLogoEmpresa(empresa);

    console.log(`[${i + 1}/${empresasAProcesar.length}] ${empresa}`);
    console.log(`   Plantilla: ${templateService.getTemplatePath(empresa)}`);

    // 1. Generar HTML
    const html = templateService.generarHtml({
      empresa,
      nitEmpresa: nit,
      logoEmpresa: logo,
      empleado: "Jeremy López Tello",
      cargo: "Desarrollador de Software",
      departamento: "Tecnología",
      fechaImpresion: new Date().toLocaleDateString("es-GT"),
      rangoPeriodo: "01/04/2026 – 15/04/2026",
      area: "Oficinas Centrales",
      liquidoARecibir: "Q 1,201.70",
      cantidadLetras: "Un mil doscientos uno quetzales con 70/100",
      nitEmpleado: "9876543-2",
      noBoleta: `BOL-${String(i + 1).padStart(4, "0")}`,
      detalleHtml: DETALLE_HTML,
      nombreBoleta,
    });

    // 2. Generar PDF
    const pdfPath = templateService.getTempPdfPath(nombreBoleta);
    await pdfService.htmlToPdf(html, pdfPath);
    console.log(`   PDF generado: ${pdfPath}`);

    // 3. Enviar correo (solo si se pasa --enviar)
    const asunto = `[TEST] Boleta de Pago – ${empresa}`;
    const cuerpo = `
      <p>Estimado(a) <b>Jeremy López Tello</b>,</p>
      <p>Adjunto encontrará su boleta de pago correspondiente al periodo <b>01/04/2026 – 15/04/2026</b>.</p>
      <p>Empresa: <b>${empresa}</b></p>
      <p><i>Este es un correo de prueba generado automáticamente.</i></p>
    `;

    if (enviarReal) {
      await mailService.sendMail(cuerpo, asunto, DESTINATARIO, pdfPath);
      console.log("   Correo enviado");
    } else {
      console.log("   (correo omitido por simulacion, usa --enviar para envio real)");
    }

    const isLast = i === empresasAProcesar.length - 1;
    if (!isLast && delayMs > 0) {
      console.log(`   Esperando ${delayMs} ms antes del siguiente envio...\n`);
      await sleep(delayMs);
    } else {
      console.log("");
    }
  }

  await pdfService.close();
  console.log("=== Todas las boletas enviadas exitosamente ===\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

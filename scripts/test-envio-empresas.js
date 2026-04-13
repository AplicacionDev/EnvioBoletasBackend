/**
 * Script de prueba: genera una boleta PDF por cada empresa y la envía
 * al correo jeremytello27@gmail.com con datos ficticios.
 *
 * Ejecutar:  node scripts/test-envio-empresas.js
 */
require("dotenv").config();

const { BoletaTemplateService } = require("../src/infrastructure/services/BoletaTemplateService");
const { PdfService } = require("../src/infrastructure/services/PdfService");
const { SmtpMailService } = require("../src/infrastructure/services/SmtpMailService");

const DESTINATARIO = "jeremytello27@gmail.com";

const EMPRESAS = [
  { empresa: "Productos Alimenticios Centroamericanos, S.A.",  nit: "123456-7" },
  { empresa: "Advert Talent, S.A.",                            nit: "234567-8" },
  { empresa: "Alimenti, S.A.",                                 nit: "345678-9" },
  { empresa: "Altoplast, S.A.",                                nit: "456789-0" },
  { empresa: "Disalto, S.A.",                                  nit: "567890-1" },
  { empresa: "Maqusa Rent, S.A.",                              nit: "678901-2" },
  { empresa: "Salinas y Minerva, S.A.",                        nit: "789012-3" },
];

const DETALLE_HTML = `
<table>
  <thead>
    <tr>
      <th>Concepto</th>
      <th>Ingresos</th>
      <th>Descuentos</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Salario Base</td><td>Q 1,000.00</td><td></td></tr>
    <tr><td>Bonificación Incentivo</td><td>Q 250.00</td><td></td></tr>
    <tr><td>IGSS</td><td></td><td>Q 48.30</td></tr>
    <tr><td><strong>TOTALES</strong></td><td><strong>Q 1,250.00</strong></td><td><strong>Q 48.30</strong></td></tr>
  </tbody>
</table>`;

async function main() {
  const templateService = new BoletaTemplateService();
  const pdfService = new PdfService();
  const mailService = new SmtpMailService();

  console.log(`\n=== Test de envío de boletas – ${EMPRESAS.length} empresas ===\n`);

  for (let i = 0; i < EMPRESAS.length; i++) {
    const { empresa, nit } = EMPRESAS[i];
    const nombreBoleta = `TEST_${Date.now()}_${i}`;
    const logo = templateService.getLogoEmpresa(empresa);

    console.log(`[${i + 1}/${EMPRESAS.length}] ${empresa}`);
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

    // 3. Enviar correo (deshabilitado para prueba sin envío)
    // const asunto = `[TEST] Boleta de Pago – ${empresa}`;
    // const cuerpo = `
    //   <p>Estimado(a) <b>Jeremy López Tello</b>,</p>
    //   <p>Adjunto encontrará su boleta de pago correspondiente al periodo <b>01/04/2026 – 15/04/2026</b>.</p>
    //   <p>Empresa: <b>${empresa}</b></p>
    //   <p><i>Este es un correo de prueba generado automáticamente.</i></p>
    // `;
    // await mailService.sendMailSmtp(cuerpo, asunto, DESTINATARIO, pdfPath);
    console.log(`   (correo omitido)\n`);
  }

  await pdfService.close();
  console.log("=== Todas las boletas enviadas exitosamente ===\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

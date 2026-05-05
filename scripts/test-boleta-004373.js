/**
 * Script de prueba: procesa y envía la boleta real del empleado 004373
 * SIN grabar en BTASimpresion NI eliminar de BTASnoimpresas.
 *
 * Ejecutar: node scripts/test-boleta-004373.js
 */
require("dotenv").config();

const { MssqlBoletaQueryRepository } = require("../src/infrastructure/repositories/MssqlBoletaQueryRepository");
const { GraphMailService }            = require("../src/infrastructure/services/GraphMailService");
const { SmtpMailService }             = require("../src/infrastructure/services/SmtpMailService");
const { BoletaTemplateService }       = require("../src/infrastructure/services/BoletaTemplateService");
const { PdfService }                  = require("../src/infrastructure/services/PdfService");
const { envs }                        = require("../src/config/envs");

const NO_EMP = "004373";

function toSafeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const str = String(value).trim();
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) return direct;
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?/);
  if (match) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = match;
    const c = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
    if (!isNaN(c.getTime())) return c;
  }
  return null;
}

async function main() {
  const repo            = new MssqlBoletaQueryRepository();
  const templateService = new BoletaTemplateService();
  const pdfService      = new PdfService();
  const mailService     = envs.MAIL_PROVIDER === "graph" ? new GraphMailService() : new SmtpMailService();

  console.log(`\n=== TEST boleta empleado ${NO_EMP} (sin modificar BD) ===\n`);
  console.log(`[Mail] Proveedor: ${envs.MAIL_PROVIDER}`);

  // 1. Boletas pendientes del empleado
  const boletas = await repo.getBoletasEmpleado(NO_EMP, new Date());
  console.log(`[SQL] Boletas pendientes para ${NO_EMP}: ${boletas.length}`);

  if (boletas.length === 0) {
    console.log("No hay boletas pendientes para este empleado.");
    await pdfService.close();
    return;
  }

  // Procesar solo la primera boleta
  const boleta = boletas[0];
  const period = parseInt(boleta.Period) || 0;

  const rawStart = boleta["Start Date"] ?? boleta["StartDate"] ?? boleta["startDate"];
  const rawEnd   = boleta["End Date"]   ?? boleta["EndDate"]   ?? boleta["endDate"];
  console.log(`[SQL] Start="${rawStart}" (${typeof rawStart})  End="${rawEnd}" (${typeof rawEnd})  Period=${period}`);

  const startDate  = toSafeDate(rawStart);
  const endDateObj = toSafeDate(rawEnd);

  if (!startDate || !endDateObj) {
    console.error(`Fechas inválidas: Start="${rawStart}" End="${rawEnd}"`);
    await pdfService.close();
    return;
  }

  const pad2    = (n) => String(n).padStart(2, "0");
  const endDate = `${pad2(endDateObj.getUTCDate())}/${pad2(endDateObj.getUTCMonth() + 1)}/${endDateObj.getUTCFullYear()}`;
  const ahora   = new Date();

  // 2. Obtener datos del empleado
  console.log(`[SQL] getDatosEmpleado tipoPago=0 endDate="${endDate}"`);
  const recordsets = await repo.getDatosEmpleado(NO_EMP, ahora, startDate, 0, endDate);

  const empresaInfo   = recordsets[0]?.[0] || {};
  const datosEmpleado = recordsets[1]?.[0] || {};
  const detalleHtml   = recordsets[2]?.[0]?.DetalleHTML || "";

  console.log(`[OK] Empleado: ${datosEmpleado.Empleado} | Correo: ${datosEmpleado.CorreoPersonal || datosEmpleado.Correo || "(sin correo)"}`);

  // 3. Generar HTML y PDF
  const pad         = (n) => String(n).padStart(2, "0");
  const nombreBoleta =
    `${pad(ahora.getDate())}${pad(ahora.getMonth() + 1)}${ahora.getFullYear()}` +
    `${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}` +
    NO_EMP +
    `${startDate.getFullYear()}${pad(startDate.getMonth() + 1)}` +
    period;

  const logoEmpresa = templateService.getLogoEmpresa(empresaInfo.Empresa || "");
  const html = templateService.generarHtml({
    empresa:        empresaInfo.Empresa || "",
    nitEmpresa:     empresaInfo.NitEmpresa || "",
    logoEmpresa,
    empleado:       datosEmpleado.Empleado || "",
    cargo:          datosEmpleado.Cargo || "",
    departamento:   datosEmpleado.Departamento || "",
    fechaImpresion: ahora.toLocaleString("es-GT"),
    rangoPeriodo:   datosEmpleado.RangoPeriodo || "",
    area:           datosEmpleado.Area || "",
    liquidoARecibir:  datosEmpleado.LiquidoARecibir || "",
    cantidadLetras:   datosEmpleado.CantidadLetras || "",
    nitEmpleado:    datosEmpleado.NitEmpleado || "",
    noBoleta:       datosEmpleado.NoBoleta || "",
    detalleHtml,
    nombreBoleta,
  });

  const pdfPath = templateService.getTempPdfPath(nombreBoleta);
  await pdfService.htmlToPdf(html, pdfPath);
  console.log(`[OK] PDF generado: ${pdfPath}`);

  // 4. Enviar correo (al correo real del empleado)
  const email = datosEmpleado.CorreoPersonal || datosEmpleado.Correo || "";
  if (!email) {
    console.warn(`[WARN] El empleado ${NO_EMP} no tiene correo, no se envía.`);
  } else {
    const rangoPeriodo = datosEmpleado.RangoPeriodo || "Periodo";
    const asunto = `Boleta ${rangoPeriodo}`;
    const cuerpo =
      `Buen día estimado colaborador (a): <br><br>` +
      `Por este medio se hace entrega de la boleta de pago correspondiente al periodo del ${rangoPeriodo}.<br><br>` +
      `Cualquier duda o inquietud favor de comunicarse a la extensión 3450 o en oficina de Compensaciones.<br><br>` +
      `Por favor no responder este correo.<br><br>` +
      `Saludos Cordiales.`;

    console.log(`[Mail] Enviando a ${email}...`);
    await mailService.sendMail(cuerpo, asunto, email, pdfPath);
    console.log(`[OK] Correo enviado a ${email}`);
  }

  // 5. NO se graba en BTASimpresion ni se elimina de BTASnoimpresas (modo test)
  console.log(`\n[TEST] BD sin cambios (grabaBoletaImpresa y eliminaDeBTASnoimpresas omitidos).\n`);

  await pdfService.close();
}

main().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});

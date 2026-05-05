const fs = require("fs");
const { envs } = require("../../config/envs");

/**
 * Convierte cualquier valor de fecha (Date, ISO string, "dd/MM/yyyy") a un Date válido.
 * Devuelve null si el valor es nulo/undefined o no puede interpretarse.
 */
function toSafeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();

  // Intentar parseo estándar (ISO 8601, etc.)
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) return direct;

  // Formato dd/MM/yyyy o dd/MM/yyyy HH:mm:ss (cultura es-GT)
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?/);
  if (match) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = match;
    const candidate = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
    if (!isNaN(candidate.getTime())) return candidate;
  }

  return null;
}

/**
 * Caso de uso principal: flujo completo de envío de boletas.
 * Replica el flujo exacto del Program.cs de C#.
 *
 * Flujo:
 * 1. Obtener empleados con boletas pendientes
 * 2. Por cada empleado, obtener sus boletas pendientes (sp_sel_impresiones_pendientes)
 * 3. Por cada boleta, ciclo tipoPago (doble si period=13|23)
 *    a. Obtener datos del empleado (SP_ObtieneDatosEmpleado)
 *    b. Generar HTML con template
 *    c. Convertir HTML a PDF
 *    d. Enviar correo con mensaje de cortesía + PDF adjunto
 *    e. Grabar boleta como impresa en BD
 *    f. Eliminar de tabla de pendientes
 */
class ProcesarBoletasPendientes {
  constructor({ boletaQueryRepository, mailService, templateService, pdfService }) {
    this.boletaQueryRepository = boletaQueryRepository;
    this.mailService = mailService;
    this.templateService = templateService;
    this.pdfService = pdfService;
    this.mailConfig = {
      throttleMs: Math.max(0, envs.MAIL_THROTTLE_MS),
      batchSize: Math.max(1, envs.MAIL_BATCH_SIZE),
      batchPauseMs: Math.max(0, envs.MAIL_BATCH_PAUSE_MS),
      maxRetries: Math.max(0, envs.MAIL_MAX_RETRIES),
      retryBaseMs: Math.max(250, envs.MAIL_RETRY_BASE_MS),
      perMinuteLimit: Math.max(0, envs.MAIL_PER_MINUTE_LIMIT),
    };
    this._emailsIntentados = 0;
    this._sentTimestamps = [];
  }

  async execute(options = {}) {
    const maxBoletas = Number.isFinite(Number(options.maxBoletas)) && Number(options.maxBoletas) > 0
      ? Math.floor(Number(options.maxBoletas))
      : Infinity;

    const resultados = {
      enviadas: 0,
      procesadas: 0,
      errores: [],
      maxBoletas: Number.isFinite(maxBoletas) ? maxBoletas : null,
    };
    this._emailsIntentados = 0;

    // Verificar si ya hay boletas pendientes en la tabla antes de ejecutar el SP.
    // Si la tabla está vacía → correr SP para llenarla.
    // Si ya tiene registros → saltarse el SP y enviar directamente.
    const totalPendientes = await this.boletaQueryRepository.contarBoletasPendientes();
    console.log(`[ProcesarBoletas] Boletas pendientes en tabla: ${totalPendientes}`);

    if (totalPendientes === 0) {
      console.log(`[ProcesarBoletas] Tabla vacía → ejecutando SP de preparación...`);
      await this.boletaQueryRepository.ejecutarPreparacionPendientes();
    } else {
      console.log(`[ProcesarBoletas] Tabla con registros → omitiendo SP, procediendo a enviar.`);
    }

    // 1. Obtener empleados con boletas pendientes
    const empleados = await this.boletaQueryRepository.getEmpleadosConBoletasPendientes();
    console.log(`[ProcesarBoletas] ${empleados.length} empleados con boletas pendientes`);

    // Priorizar empleado 004373: va primero, el resto mantiene su orden original
    const PRIORIDAD_NOEMP = "004373";
    const empleadosOrdenados = [
      ...empleados.filter(e => e.NoEmp === PRIORIDAD_NOEMP),
      ...empleados.filter(e => e.NoEmp !== PRIORIDAD_NOEMP),
    ];

    for (const emp of empleadosOrdenados) {
      if (resultados.procesadas >= maxBoletas) {
        console.log(`[ProcesarBoletas] Límite de ${maxBoletas} boletas alcanzado (procesadas). Se detiene el proceso.`);
        break;
      }

      try {
        await this.#procesarEmpleado(emp, resultados, maxBoletas);
      } catch (error) {
        const msg = `Error procesando empleado ${emp.NoEmp}: ${error.message}`;
        console.error(`[ProcesarBoletas] ${msg}`);
        resultados.errores.push(msg);
      }
    }

    // Cerrar browser de puppeteer al terminar el lote
    await this.pdfService.close();

    console.log(
      `[ProcesarBoletas] Finalizado: ${resultados.enviadas} enviadas, ${resultados.procesadas} procesadas, ${resultados.errores.length} errores`
    );
    return resultados;
  }

  async #procesarEmpleado(emp, resultados, maxBoletas) {
    const { NoEmp, Em_Company, Em_EMail } = emp;
    console.log(`[ProcesarBoletas] Procesando empleado ${NoEmp}`);

    // 2. Obtener boletas pendientes del empleado
    const boletas = await this.boletaQueryRepository.getBoletasEmpleado(NoEmp, new Date());

    if (boletas.length === 0) return;

    for (const boleta of boletas) {
      if (resultados.procesadas >= maxBoletas) {
        break;
      }

      try {
        // Campos del SP sp_sel_impresiones_pendientes
        const period = parseInt(boleta.Period) || 0;

        // Log diagnóstico: muestra los campos y valores reales del SP
        const rawStart = boleta["Start Date"] ?? boleta["start date"] ?? boleta["StartDate"] ?? boleta["startDate"];
        const rawEnd   = boleta["End Date"]   ?? boleta["end date"]   ?? boleta["EndDate"]   ?? boleta["endDate"];
        console.log(`[ProcesarBoletas] Boleta raw NoEmp=${NoEmp} period=${period} StartDate="${rawStart}" (${typeof rawStart}) EndDate="${rawEnd}" (${typeof rawEnd})`);

        const startDate = toSafeDate(rawStart);
        const endDateObj = toSafeDate(rawEnd);

        if (!startDate || !endDateObj) {
          const msg = `Fechas inválidas en boleta de ${NoEmp} (periodo ${boleta.Period || "?"}): Start="${boleta["Start Date"]}" End="${boleta["End Date"]}"`;
          console.error(`[ProcesarBoletas] ${msg}`);
          resultados.errores.push(msg);
          continue;
        }

        // El SP en SQL espera i_EndDate como varchar en formato dd/MM/yyyy (style 103).
        // Con driver tedious en Docker, usar este formato evita conversiones ambiguas.
        const pad2 = (n) => String(n).padStart(2, "0");
        const endDate = `${pad2(endDateObj.getUTCDate())}/${pad2(endDateObj.getUTCMonth() + 1)}/${endDateObj.getUTCFullYear()}`;

        // Si period=13 o 23 (Aguinaldo/Bono14), tipoPago inicia en 1 (2 iteraciones: 1 y 0)
        // Si no, tipoPago inicia en 0 (1 iteración)
        let tipoPago = (period === 13 || period === 23) ? 1 : 0;

        while (tipoPago >= 0) {
          if (resultados.procesadas >= maxBoletas) {
            break;
          }

          resultados.procesadas++;
          await this.#procesarBoleta(NoEmp, Em_Company, startDate, endDate, period, tipoPago, resultados);
          tipoPago--;
        }
      } catch (error) {
        const msg = `Error en boleta de ${NoEmp} (periodo ${boleta.Period || "?"}): ${error.message}`;
        console.error(`[ProcesarBoletas] ${msg}`);
        resultados.errores.push(msg);
      }
    }
  }

  async #procesarBoleta(noEmp, empresa, startDate, endDate, period, tipoPago, resultados) {
    const ahora = new Date();

    // 3. Obtener datos completos del empleado
    console.log(`[SQL] getDatosEmpleado noEmp=${noEmp} fechaImpresion=${ahora.toISOString()} fecha=${startDate.toISOString()} tipoPago=${tipoPago} endDate="${endDate}"`);
    let recordsets;
    try {
      recordsets = await this.boletaQueryRepository.getDatosEmpleado(
        noEmp,
        ahora,
        startDate,
        tipoPago,
        endDate
      );
    } catch (err) {
      throw new Error(`getDatosEmpleado falló: ${err.message}`);
    }

    // El SP devuelve 3 recordsets:
    // [0] = empresa info (Empresa, NitEmpresa, Picture)
    // [1] = datos del empleado (Empleado, Cargo, Departamento, RangoPeriodo, etc.)
    // [2] = detalle HTML generado por el SP (campo DetalleHTML)
    const empresaInfo = recordsets[0]?.[0] || {};
    const datosEmpleado = recordsets[1]?.[0] || {};
    const detalleHtml = recordsets[2]?.[0]?.DetalleHTML || "";

    console.log(`[ProcesarBoletas] Empleado: ${datosEmpleado.Empleado} | Cargo: ${datosEmpleado.Cargo}`);

    // Nombre de boleta: {ddMMyyyyHHmmss}{NoEmp}{yyyyMM}{Period}
    const pad = (n) => String(n).padStart(2, "0");
    const nombreBoleta =
      `${pad(ahora.getDate())}${pad(ahora.getMonth() + 1)}${ahora.getFullYear()}${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}` +
      noEmp +
      `${startDate.getFullYear()}${pad(startDate.getMonth() + 1)}` +
      period;

    // Logo de la empresa
    const logoEmpresa = this.templateService.getLogoEmpresa(empresaInfo.Empresa || empresa);

    // Formatear fecha de impresión
    const fechaImpFmt = ahora.toLocaleString("es-GT");

    // 4. Generar HTML (boleta para PDF)
    const html = this.templateService.generarHtml({
      empresa: empresaInfo.Empresa || empresa,
      nitEmpresa: empresaInfo.NitEmpresa || "",
      logoEmpresa,
      empleado: datosEmpleado.Empleado || "",
      cargo: datosEmpleado.Cargo || "",
      departamento: datosEmpleado.Departamento || "",
      fechaImpresion: fechaImpFmt,
      rangoPeriodo: datosEmpleado.RangoPeriodo || "",
      area: datosEmpleado.Area || "",
      liquidoARecibir: datosEmpleado.LiquidoARecibir || "",
      cantidadLetras: datosEmpleado.CantidadLetras || "",
      nitEmpleado: datosEmpleado.NitEmpleado || "",
      noBoleta: datosEmpleado.NoBoleta || "",
      detalleHtml,
      nombreBoleta,
    });

    // 5. Convertir a PDF
    const pdfPath = this.templateService.getTempPdfPath(nombreBoleta);
    await this.pdfService.htmlToPdf(html, pdfPath);

    // 6. Enviar correo con mensaje de cortesía (igual que el C#)
    const email = datosEmpleado.CorreoPersonal || datosEmpleado.Correo || "";
    const rangoPeriodo = datosEmpleado.RangoPeriodo || "Periodo";

    if (email) {
      const asunto = `Boleta ${rangoPeriodo}`;
      const cuerpoCorreo =
        `Buen día estimado colaborador (a): <br><br>` +
        `Por este medio se hace entrega de la boleta de pago correspondiente al periodo del ${rangoPeriodo}.<br><br> ` +
        `Cualquier duda o inquietud favor de comunicarse a la extensión 3450 o en oficina de Compensaciones. <br><br> ` +
        `Por favor no responder este correo. <br><br> ` +
        `Saludos Cordiales.`;

      console.log(`[ProcesarBoletas] Enviando correo a ${email}...`);
      await this.#enviarCorreoConControl(cuerpoCorreo, asunto, email, pdfPath);
      console.log(`[ProcesarBoletas] Correo enviado a ${email}`);
    } else {
      console.warn(`[ProcesarBoletas] ⚠ Empleado ${noEmp} NO tiene correo personal, se omite envío`);
    }

    // 7. Grabar como impresa
    const pdfBuffer = this.pdfService.readPdfBuffer(pdfPath);
    console.log(`[SQL] grabaBoletaImpresa noEmp=${noEmp} fechaImpresion=${ahora.toISOString()} periodo=${startDate.toISOString()}`);
    try {
      await this.boletaQueryRepository.grabaBoletaImpresa(
        noEmp,
        ahora,
        startDate,
        pdfBuffer,
        nombreBoleta,
        String(tipoPago)
      );
    } catch (err) {
      throw new Error(`grabaBoletaImpresa falló: ${err.message}`);
    }

    // 8. Eliminar de pendientes
    console.log(`[SQL] eliminaDeBTASnoimpresas noEmp=${noEmp} periodo=${startDate.toISOString()}`);
    try {
      await this.boletaQueryRepository.eliminaDeBTASnoimpresas(noEmp, startDate);
    } catch (err) {
      throw new Error(`eliminaDeBTASnoimpresas falló: ${err.message}`);
    }

    // Limpiar archivos temporales
    this.#limpiarTemporales(nombreBoleta);

    resultados.enviadas++;
    console.log(`[ProcesarBoletas] Boleta enviada: ${noEmp} -> ${email}`);
  }

  async #enviarCorreoConControl(cuerpoCorreo, asunto, email, pdfPath) {
    let attempt = 0;

    while (attempt <= this.mailConfig.maxRetries) {
      try {
        await this.mailService.sendMail(cuerpoCorreo, asunto, email, pdfPath);
        this._emailsIntentados++;
        await this.#aplicarPausaDeEnvio();
        return;
      } catch (error) {
        const transient = this.#esErrorTransitorio(error);
        const canRetry = transient && attempt < this.mailConfig.maxRetries;

        if (!canRetry) {
          throw error;
        }

        const waitMs = error.retryAfter
          ? error.retryAfter * 1000 + 500
          : this.#calcularBackoffMs(attempt);
        console.warn(
          `[ProcesarBoletas] Error transitorio al enviar a ${email}. Reintento ${attempt + 1}/${this.mailConfig.maxRetries} en ${waitMs} ms${error.retryAfter ? " (Retry-After del servidor)" : ""}`
        );
        await this.#sleep(waitMs);
      }

      attempt++;
    }
  }

  async #aplicarPausaDeEnvio() {
    const { throttleMs, batchSize, batchPauseMs, perMinuteLimit } = this.mailConfig;
    const now = Date.now();

    // --- Límite deslizante por minuto (sliding-window) ---
    if (perMinuteLimit > 0) {
      this._sentTimestamps.push(now);
      this._sentTimestamps = this._sentTimestamps.filter((t) => now - t < 60_000);

      if (this._sentTimestamps.length >= perMinuteLimit) {
        const waitMs = 60_000 - (now - this._sentTimestamps[0]) + 200;
        if (waitMs > 0) {
          console.log(
            `[ProcesarBoletas] Límite de ${perMinuteLimit} correos/min alcanzado. Esperando ${waitMs} ms`
          );
          await this.#sleep(waitMs);
          this._sentTimestamps = this._sentTimestamps.filter((t) => Date.now() - t < 60_000);
        }
      }
    }

    // --- Pausa de lote ---
    if (this._emailsIntentados % batchSize === 0 && batchPauseMs > 0) {
      console.log(`[ProcesarBoletas] Pausa de lote: ${batchPauseMs} ms tras ${this._emailsIntentados} correos`);
      await this.#sleep(batchPauseMs);
      return;
    }

    // --- Throttle por correo ---
    if (throttleMs > 0) {
      await this.#sleep(throttleMs);
    }
  }

  #esErrorTransitorio(error) {
    const status = Number(error?.status || error?.response?.statusCode || error?.responseCode || 0);
    if ([408, 421, 429, 450, 451, 452, 454, 500, 502, 503, 504].includes(status)) {
      return true;
    }

    const code = String(error?.code || "").toUpperCase();
    if (["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ESOCKET"].includes(code)) {
      return true;
    }

    const msg = String(error?.message || "").toLowerCase();
    return (
      msg.includes("throttle") ||
      msg.includes("too many requests") ||
      msg.includes("toomanyrequests") ||
      msg.includes("temporar") ||
      msg.includes("timeout")
    );
  }

  #calcularBackoffMs(attempt) {
    const expo = this.mailConfig.retryBaseMs * 2 ** attempt;
    const jitter = Math.floor(Math.random() * 500);
    return expo + jitter;
  }

  #sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  #limpiarTemporales(nombreBoleta) {
    try {
      const pdfPath = this.templateService.getTempPdfPath(nombreBoleta);
      const htmlPath = this.templateService.getTempHtmlPath(nombreBoleta);
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
    } catch {
      // No bloquear si falla la limpieza
    }
  }
}

module.exports = { ProcesarBoletasPendientes };

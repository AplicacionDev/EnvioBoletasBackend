const fs = require("fs");

/**
 * Caso de uso principal: flujo completo de envío de boletas.
 *
 * Flujo:
 * 1. Obtener empleados con boletas pendientes
 * 2. Por cada empleado, obtener sus boletas pendientes
 * 3. Por cada boleta, obtener datos del empleado
 * 4. Generar HTML con template
 * 5. Convertir HTML a PDF
 * 6. Enviar correo con PDF adjunto
 * 7. Grabar boleta como impresa en BD
 * 8. Eliminar de tabla de pendientes
 */
class ProcesarBoletasPendientes {
  constructor({ boletaQueryRepository, mailService, templateService, pdfService }) {
    this.boletaQueryRepository = boletaQueryRepository;
    this.mailService = mailService;
    this.templateService = templateService;
    this.pdfService = pdfService;
  }

  async execute() {
    const resultados = { enviadas: 0, errores: [] };

    // 1. Obtener empleados con boletas pendientes
    const empleados = await this.boletaQueryRepository.getEmpleadosConBoletasPendientes();
    console.log(`[ProcesarBoletas] ${empleados.length} empleados con boletas pendientes`);

    for (const emp of empleados) {
      try {
        await this.#procesarEmpleado(emp, resultados);
      } catch (error) {
        const msg = `Error procesando empleado ${emp.NoEmp}: ${error.message}`;
        console.error(`[ProcesarBoletas] ${msg}`);
        resultados.errores.push(msg);
      }
    }

    // Cerrar browser de puppeteer al terminar el lote
    await this.pdfService.close();

    console.log(`[ProcesarBoletas] Finalizado: ${resultados.enviadas} enviadas, ${resultados.errores.length} errores`);
    return resultados;
  }

  async #procesarEmpleado(emp, resultados) {
    const { NoEmp, Em_Company, Em_EMail } = emp;
    console.log(`[ProcesarBoletas] Procesando empleado ${NoEmp} - Email: ${Em_EMail}`);

    // 2. Obtener boletas pendientes del empleado
    const boletas = await this.boletaQueryRepository.getBoletasEmpleado(NoEmp, new Date());

    for (const boleta of boletas) {
      try {
        await this.#procesarBoleta(NoEmp, Em_Company, Em_EMail, boleta, resultados);
      } catch (error) {
        const msg = `Error en boleta de ${NoEmp} (periodo ${boleta.Periodo || "?"}): ${error.message}`;
        console.error(`[ProcesarBoletas] ${msg}`);
        resultados.errores.push(msg);
      }
    }
  }

  async #procesarBoleta(noEmp, empresa, emailEmpleado, boleta, resultados) {
    const fechaImpresion = boleta.FechaImpresion || new Date();
    const fecha = boleta.Fecha || boleta.Periodo || new Date();
    const tipoPago = boleta.TipoPago || boleta.tipoPago || 1;
    const endDate = boleta.EndDate || boleta.endDate || "";

    // 3. Obtener datos completos del empleado
    const recordsets = await this.boletaQueryRepository.getDatosEmpleado(
      noEmp,
      fechaImpresion,
      fecha,
      tipoPago,
      endDate
    );

    // El SP devuelve múltiples recordsets:
    // [0] = empresa info (Empresa, NitEmpresa, Picture)
    // [1] = datos del empleado (Empleado, Cargo, Departamento, etc.)
    // [2+] = detalle de la boleta (ingresos/deducciones)
    const empresaInfo = recordsets[0]?.[0] || {};
    const datosEmpleado = recordsets[1]?.[0] || {};
    const detalleRows = recordsets[2] || [];

    console.log(`[ProcesarBoletas] Empresa: ${empresaInfo.Empresa}`);
    console.log(`[ProcesarBoletas] Empleado: ${datosEmpleado.Empleado} | Cargo: ${datosEmpleado.Cargo}`);
    console.log(`[ProcesarBoletas] Detalle: ${detalleRows.length} filas`);

    const detalleHtml = this.#generarDetalleHtml(detalleRows);

    const nombreBoleta = `${noEmp}_${Date.now()}`;

    // Logo de la empresa
    const logoEmpresa = this.templateService.getLogoEmpresa(empresaInfo.Empresa || empresa);

    // Formatear fecha de impresión
    const fechaImpFmt = this.#formatearFecha(fechaImpresion);

    // 4. Generar HTML
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

    // 6. Enviar correo
    const email = emailEmpleado || datosEmpleado.Correo || datosEmpleado.CorreoPersonal || "";
    console.log(`[ProcesarBoletas] Email para ${noEmp}: "${email}"`);

    if (email) {
      const asunto = `Boleta de Pago - ${datosEmpleado.RangoPeriodo || "Periodo"}`;
      console.log(`[ProcesarBoletas] Enviando correo a ${email}...`);
      await this.mailService.sendMailSmtp(html, asunto, email, pdfPath);
      console.log(`[ProcesarBoletas] Correo enviado exitosamente a ${email}`);
    } else {
      console.warn(`[ProcesarBoletas] ⚠ Empleado ${noEmp} NO tiene email, se omite envío de correo`);
    }

    // 7. Grabar como impresa
    console.log(`[ProcesarBoletas] Grabando boleta impresa para ${noEmp}...`);
    const pdfBuffer = this.pdfService.readPdfBuffer(pdfPath);
    await this.boletaQueryRepository.grabaBoletaImpresa(
      noEmp,
      fechaImpresion,
      fecha,
      pdfBuffer,
      nombreBoleta,
      String(tipoPago)
    );

    // 8. Eliminar de pendientes
    console.log(`[ProcesarBoletas] Eliminando de pendientes ${noEmp}...`);
    await this.boletaQueryRepository.eliminaDeBTASnoimpresas(noEmp, fecha);
    console.log(`[ProcesarBoletas] Pendiente eliminado para ${noEmp}`);

    // Limpiar archivos temporales
    this.#limpiarTemporales(nombreBoleta);

    resultados.enviadas++;
    console.log(`[ProcesarBoletas] Boleta enviada: ${noEmp} -> ${email}`);
  }

  #formatearFecha(fecha) {
    const d = new Date(fecha);
    return d.toLocaleDateString("es-GT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  #generarDetalleHtml(rows) {
    if (!rows || rows.length === 0) return "";

    const columns = Object.keys(rows[0]);
    let html = "<table><thead><tr>";
    for (const col of columns) {
      html += `<th>${col}</th>`;
    }
    html += "</tr></thead><tbody>";

    for (const row of rows) {
      html += "<tr>";
      for (const col of columns) {
        html += `<td>${row[col] ?? ""}</td>`;
      }
      html += "</tr>";
    }

    html += "</tbody></table>";
    return html;
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

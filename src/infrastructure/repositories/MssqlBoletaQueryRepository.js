const { BoletaQueryRepository } = require("../../domain/repositories/BoletaQueryRepository");
const { getConnection, sql } = require("../database/db");
const { envs } = require("../../config/envs");

class MssqlBoletaQueryRepository extends BoletaQueryRepository {
  async getEmpresas() {
    const pool = await getConnection();
    const result = await pool.request().query(
      `SELECT [Name] AS Id, [Name] AS Empresa
       FROM PRODUCCION.PRALCASA.dbo.Company`
    );
    return result.recordset;
  }

  async ejecutarPreparacionPendientes() {
    if (!envs.PRE_ENVIO_SP) return;

    const pool = await getConnection();
    console.log(`[SQL] Ejecutando SP previo al envío: ${envs.PRE_ENVIO_SP}`);
    await pool.request().execute(envs.PRE_ENVIO_SP);
  }

  async getEmpleadosConBoletasPendientes() {
    const pool = await getConnection();
    const result = await pool.request().query(
      `SELECT DISTINCT a.NoEmp, b.Em_Company, b.Em_EMail
       FROM PRODUCCION.[BYB_DB].dbo.[BTASnoimpresas] a
       INNER JOIN APLICACIONES.dbo.cl_Employee b
         ON a.NoEmp COLLATE database_default = b.Em_No COLLATE database_default
         AND a.Empresa = b.Em_Company COLLATE database_default
       WHERE b.Em_EMail <> ''
         AND b.Em_StatisticsGroupCode IS NULL
       ORDER BY a.NoEmp, b.Em_Company`
    );
    return result.recordset;
  }

  async getBoletasEmpleado(noEmpleado, fechaImpresion) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("i_NumeroEmpleado", sql.VarChar, noEmpleado)
      .input("i_fechaImpresion", sql.DateTime, fechaImpresion)
      .execute("APLICACIONES.dbo.sp_sel_impresiones_pendientes");

    return result.recordset;
  }

  async getDatosEmpleado(numeroEmpleado, fechaImpresion, fecha, tipoPago, endDate) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("i_NumeroEmpleado", sql.VarChar, numeroEmpleado)
      .input("i_fechaImpresion", sql.DateTime, fechaImpresion)
      .input("i_fecha", sql.DateTime, fecha)
      .input("i_tipo_pago", sql.Int, tipoPago)
      .input("i_EndDate", sql.VarChar, endDate)
      .execute("APLICACIONES.dbo.SP_ObtieneDatosEmpleado");

    return result.recordsets;
  }

  async grabaBoletaImpresa(codigoEmpleado, fechaImpresion, periodo, pdfBuffer, nombreBoleta, tipoPago) {
    const pool = await getConnection();
    await pool
      .request()
      .input("Pcodigo_empleado", sql.VarChar, codigoEmpleado)
      .input("Pfecha_impresion", sql.DateTime, fechaImpresion)
      .input("Pperiodo", sql.Date, periodo)
      .input("Pfoto", sql.VarBinary(sql.MAX), pdfBuffer)
      .input("Pnombre_boleta", sql.VarChar, nombreBoleta)
      .input("PtipoPago", sql.Char(1), tipoPago)
      .query(
        `INSERT INTO PRODUCCION.BYB_DB.dbo.BTASimpresion
           (codigo_empleado, fecha_impresion, periodo, foto, nombre_boleta, tipoPago)
         VALUES (@Pcodigo_empleado, @Pfecha_impresion, @Pperiodo, @Pfoto, @Pnombre_boleta, @PtipoPago)`
      );
  }

  async eliminaDeBTASnoimpresas(noEmpleado, fechaPeriodo) {
    const pool = await getConnection();
    await pool
      .request()
      .input("PNoEmp", sql.VarChar, noEmpleado)
      .input("PPeriodo", sql.DateTime, fechaPeriodo)
      .query(
        `DELETE FROM PRODUCCION.[BYB_DB].dbo.[BTASnoimpresas]
         WHERE NoEmp = @PNoEmp AND Periodo = @PPeriodo`
      );
  }

  async validaPlanilla(fecha) {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("PFecha", sql.VarChar, fecha)
      .execute("APLICACIONES.dbo.sp_nom_valida_planilla");

    return result.returnValue ?? result.recordset?.[0]?.[""] ?? 0;
  }
}

module.exports = { MssqlBoletaQueryRepository };

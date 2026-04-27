/**
 * @abstract
 * Interfaz que mapea las queries reales del sistema de boletas.
 * Equivalente a la clase Querys de C#.
 */
class BoletaQueryRepository {
  /** Obtiene listado de empresas */
  async getEmpresas() {
    throw new Error("Method not implemented");
  }

  /** Ejecuta proceso previo para poblar boletas pendientes */
  async ejecutarPreparacionPendientes() {
    throw new Error("Method not implemented");
  }

  /** Obtiene empleados con boletas pendientes de envío */
  async getEmpleadosConBoletasPendientes() {
    throw new Error("Method not implemented");
  }

  /** Obtiene boletas de un empleado por número y fecha de impresión */
  async getBoletasEmpleado(noEmpleado, fechaImpresion) {
    throw new Error("Method not implemented");
  }

  /** Obtiene datos completos del empleado para generar la boleta */
  async getDatosEmpleado(numeroEmpleado, fechaImpresion, fecha, tipoPago, endDate) {
    throw new Error("Method not implemented");
  }

  /** Graba la boleta como impresa/enviada */
  async grabaBoletaImpresa(codigoEmpleado, fechaImpresion, periodo, pdfBuffer, nombreBoleta, tipoPago) {
    throw new Error("Method not implemented");
  }

  /** Elimina registro de boletas no impresas una vez procesada */
  async eliminaDeBTASnoimpresas(noEmpleado, fechaPeriodo) {
    throw new Error("Method not implemented");
  }

  /** Valida si existe planilla para una fecha */
  async validaPlanilla(fecha) {
    throw new Error("Method not implemented");
  }
}

module.exports = { BoletaQueryRepository };

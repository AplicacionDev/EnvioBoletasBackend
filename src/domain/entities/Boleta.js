class Boleta {
  constructor({ id, empleadoId, periodo, fechaEmision, salarioBruto, deducciones, salarioNeto, estado, enviadaEn }) {
    this.id = id;
    this.empleadoId = empleadoId;
    this.periodo = periodo;
    this.fechaEmision = fechaEmision;
    this.salarioBruto = salarioBruto;
    this.deducciones = deducciones;
    this.salarioNeto = salarioNeto;
    this.estado = estado || "pendiente";
    this.enviadaEn = enviadaEn || null;
  }
}

module.exports = { Boleta };

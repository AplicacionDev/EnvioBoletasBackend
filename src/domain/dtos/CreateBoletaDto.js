class CreateBoletaDto {
  constructor({ empleadoId, periodo, fechaEmision, salarioBruto, deducciones, salarioNeto }) {
    this.empleadoId = empleadoId;
    this.periodo = periodo;
    this.fechaEmision = fechaEmision;
    this.salarioBruto = salarioBruto;
    this.deducciones = deducciones;
    this.salarioNeto = salarioNeto;
  }

  static validate(data) {
    const errors = [];

    if (!data.empleadoId) errors.push("empleadoId es requerido");
    if (!data.periodo) errors.push("periodo es requerido");
    if (!data.fechaEmision) errors.push("fechaEmision es requerida");
    if (data.salarioBruto == null) errors.push("salarioBruto es requerido");
    if (data.deducciones == null) errors.push("deducciones es requerido");
    if (data.salarioNeto == null) errors.push("salarioNeto es requerido");

    return errors.length > 0 ? errors : null;
  }
}

module.exports = { CreateBoletaDto };

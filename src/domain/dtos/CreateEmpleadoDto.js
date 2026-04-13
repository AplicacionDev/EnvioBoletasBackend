class CreateEmpleadoDto {
  constructor({ nombre, apellido, email, departamento }) {
    this.nombre = nombre;
    this.apellido = apellido;
    this.email = email;
    this.departamento = departamento;
  }

  static validate(data) {
    const errors = [];

    if (!data.nombre) errors.push("nombre es requerido");
    if (!data.apellido) errors.push("apellido es requerido");
    if (!data.email) errors.push("email es requerido");
    if (!data.departamento) errors.push("departamento es requerido");

    return errors.length > 0 ? errors : null;
  }
}

module.exports = { CreateEmpleadoDto };

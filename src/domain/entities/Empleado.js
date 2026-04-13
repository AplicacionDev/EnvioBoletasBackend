class Empleado {
  constructor({ id, nombre, apellido, email, departamento }) {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.email = email;
    this.departamento = departamento;
  }
}

module.exports = { Empleado };

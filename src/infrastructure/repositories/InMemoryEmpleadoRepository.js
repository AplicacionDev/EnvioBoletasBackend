const { EmpleadoRepository } = require("../../domain/repositories/EmpleadoRepository");
const { Empleado } = require("../../domain/entities/Empleado");

class InMemoryEmpleadoRepository extends EmpleadoRepository {
  constructor() {
    super();
    this.empleados = [];
    this.nextId = 1;
  }

  async getAll() {
    return [...this.empleados];
  }

  async getById(id) {
    return this.empleados.find((e) => e.id === id) || null;
  }

  async create(data) {
    const empleado = new Empleado({ id: this.nextId++, ...data });
    this.empleados.push(empleado);
    return empleado;
  }

  async update(id, data) {
    const index = this.empleados.findIndex((e) => e.id === id);
    if (index === -1) return null;

    this.empleados[index] = { ...this.empleados[index], ...data };
    return this.empleados[index];
  }

  async delete(id) {
    const index = this.empleados.findIndex((e) => e.id === id);
    if (index === -1) return false;

    this.empleados.splice(index, 1);
    return true;
  }
}

module.exports = { InMemoryEmpleadoRepository };

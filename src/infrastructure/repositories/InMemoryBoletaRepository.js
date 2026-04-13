const { BoletaRepository } = require("../../domain/repositories/BoletaRepository");
const { Boleta } = require("../../domain/entities/Boleta");

class InMemoryBoletaRepository extends BoletaRepository {
  constructor() {
    super();
    this.boletas = [];
    this.nextId = 1;
  }

  async getAll() {
    return [...this.boletas];
  }

  async getById(id) {
    return this.boletas.find((b) => b.id === id) || null;
  }

  async getByEmpleadoId(empleadoId) {
    return this.boletas.filter((b) => b.empleadoId === empleadoId);
  }

  async create(data) {
    const boleta = new Boleta({ id: this.nextId++, ...data, estado: "pendiente" });
    this.boletas.push(boleta);
    return boleta;
  }

  async update(id, data) {
    const index = this.boletas.findIndex((b) => b.id === id);
    if (index === -1) return null;

    this.boletas[index] = { ...this.boletas[index], ...data };
    return this.boletas[index];
  }

  async delete(id) {
    const index = this.boletas.findIndex((b) => b.id === id);
    if (index === -1) return false;

    this.boletas.splice(index, 1);
    return true;
  }
}

module.exports = { InMemoryBoletaRepository };

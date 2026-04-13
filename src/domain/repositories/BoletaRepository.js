/**
 * @abstract
 */
class BoletaRepository {
  async getAll() {
    throw new Error("Method not implemented");
  }

  async getById(id) {
    throw new Error("Method not implemented");
  }

  async getByEmpleadoId(empleadoId) {
    throw new Error("Method not implemented");
  }

  async create(boleta) {
    throw new Error("Method not implemented");
  }

  async update(id, boleta) {
    throw new Error("Method not implemented");
  }

  async delete(id) {
    throw new Error("Method not implemented");
  }
}

module.exports = { BoletaRepository };

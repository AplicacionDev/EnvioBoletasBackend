/**
 * @abstract
 */
class EmpleadoRepository {
  async getAll() {
    throw new Error("Method not implemented");
  }

  async getById(id) {
    throw new Error("Method not implemented");
  }

  async create(empleado) {
    throw new Error("Method not implemented");
  }

  async update(id, empleado) {
    throw new Error("Method not implemented");
  }

  async delete(id) {
    throw new Error("Method not implemented");
  }
}

module.exports = { EmpleadoRepository };

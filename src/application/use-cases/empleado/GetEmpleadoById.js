class GetEmpleadoById {
  constructor(empleadoRepository) {
    this.empleadoRepository = empleadoRepository;
  }

  async execute(id) {
    const empleado = await this.empleadoRepository.getById(id);
    if (!empleado) throw { statusCode: 404, message: "Empleado no encontrado" };
    return empleado;
  }
}

module.exports = { GetEmpleadoById };

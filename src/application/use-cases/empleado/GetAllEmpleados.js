class GetAllEmpleados {
  constructor(empleadoRepository) {
    this.empleadoRepository = empleadoRepository;
  }

  async execute() {
    return this.empleadoRepository.getAll();
  }
}

module.exports = { GetAllEmpleados };

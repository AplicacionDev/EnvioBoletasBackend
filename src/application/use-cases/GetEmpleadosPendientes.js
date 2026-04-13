class GetEmpleadosPendientes {
  constructor(boletaQueryRepository) {
    this.boletaQueryRepository = boletaQueryRepository;
  }

  async execute() {
    return this.boletaQueryRepository.getEmpleadosConBoletasPendientes();
  }
}

module.exports = { GetEmpleadosPendientes };

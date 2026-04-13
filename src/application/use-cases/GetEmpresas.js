class GetEmpresas {
  constructor(boletaQueryRepository) {
    this.boletaQueryRepository = boletaQueryRepository;
  }

  async execute() {
    return this.boletaQueryRepository.getEmpresas();
  }
}

module.exports = { GetEmpresas };

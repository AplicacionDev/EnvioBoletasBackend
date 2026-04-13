class GetAllBoletas {
  constructor(boletaRepository) {
    this.boletaRepository = boletaRepository;
  }

  async execute() {
    return this.boletaRepository.getAll();
  }
}

module.exports = { GetAllBoletas };

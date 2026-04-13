class UpdateBoleta {
  constructor(boletaRepository) {
    this.boletaRepository = boletaRepository;
  }

  async execute(id, data) {
    const existing = await this.boletaRepository.getById(id);
    if (!existing) throw { statusCode: 404, message: "Boleta no encontrada" };

    return this.boletaRepository.update(id, data);
  }
}

module.exports = { UpdateBoleta };

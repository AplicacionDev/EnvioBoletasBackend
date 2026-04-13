class DeleteBoleta {
  constructor(boletaRepository) {
    this.boletaRepository = boletaRepository;
  }

  async execute(id) {
    const existing = await this.boletaRepository.getById(id);
    if (!existing) throw { statusCode: 404, message: "Boleta no encontrada" };

    return this.boletaRepository.delete(id);
  }
}

module.exports = { DeleteBoleta };

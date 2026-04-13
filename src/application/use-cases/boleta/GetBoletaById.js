class GetBoletaById {
  constructor(boletaRepository) {
    this.boletaRepository = boletaRepository;
  }

  async execute(id) {
    const boleta = await this.boletaRepository.getById(id);
    if (!boleta) throw { statusCode: 404, message: "Boleta no encontrada" };
    return boleta;
  }
}

module.exports = { GetBoletaById };

class EnviarBoleta {
  constructor(boletaRepository) {
    this.boletaRepository = boletaRepository;
  }

  async execute(id) {
    const boleta = await this.boletaRepository.getById(id);
    if (!boleta) throw { statusCode: 404, message: "Boleta no encontrada" };

    if (boleta.estado === "enviada") {
      throw { statusCode: 400, message: "La boleta ya fue enviada" };
    }

    return this.boletaRepository.update(id, {
      estado: "enviada",
      enviadaEn: new Date().toISOString(),
    });
  }
}

module.exports = { EnviarBoleta };

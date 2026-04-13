class ValidarPlanilla {
  constructor(boletaQueryRepository) {
    this.boletaQueryRepository = boletaQueryRepository;
  }

  async execute(fecha) {
    if (!fecha) throw { statusCode: 400, message: "La fecha es requerida" };
    const boletas = await this.boletaQueryRepository.validaPlanilla(fecha);
    return { fecha, boletas };
  }
}

module.exports = { ValidarPlanilla };

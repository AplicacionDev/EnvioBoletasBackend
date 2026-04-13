const { CreateBoletaDto } = require("../../../domain/dtos/CreateBoletaDto");

class CreateBoleta {
  constructor(boletaRepository) {
    this.boletaRepository = boletaRepository;
  }

  async execute(data) {
    const errors = CreateBoletaDto.validate(data);
    if (errors) throw { statusCode: 400, message: "Datos inválidos", errors };

    const dto = new CreateBoletaDto(data);
    return this.boletaRepository.create(dto);
  }
}

module.exports = { CreateBoleta };

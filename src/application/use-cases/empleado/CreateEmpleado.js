const { CreateEmpleadoDto } = require("../../../domain/dtos/CreateEmpleadoDto");

class CreateEmpleado {
  constructor(empleadoRepository) {
    this.empleadoRepository = empleadoRepository;
  }

  async execute(data) {
    const errors = CreateEmpleadoDto.validate(data);
    if (errors) throw { statusCode: 400, message: "Datos inválidos", errors };

    const dto = new CreateEmpleadoDto(data);
    return this.empleadoRepository.create(dto);
  }
}

module.exports = { CreateEmpleado };

class EmpleadoController {
  constructor({ getAllEmpleados, getEmpleadoById, createEmpleado }) {
    this.getAllEmpleados = getAllEmpleados;
    this.getEmpleadoById = getEmpleadoById;
    this.createEmpleado = createEmpleado;
  }

  getAll = async (req, res, next) => {
    try {
      const empleados = await this.getAllEmpleados.execute();
      res.json(empleados);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const empleado = await this.getEmpleadoById.execute(Number(req.params.id));
      res.json(empleado);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const empleado = await this.createEmpleado.execute(req.body);
      res.status(201).json(empleado);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { EmpleadoController };

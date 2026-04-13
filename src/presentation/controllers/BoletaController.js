class BoletaController {
  constructor({ getAllBoletas, getBoletaById, createBoleta, updateBoleta, deleteBoleta, enviarBoleta }) {
    this.getAllBoletas = getAllBoletas;
    this.getBoletaById = getBoletaById;
    this.createBoleta = createBoleta;
    this.updateBoleta = updateBoleta;
    this.deleteBoleta = deleteBoleta;
    this.enviarBoleta = enviarBoleta;
  }

  getAll = async (req, res, next) => {
    try {
      const boletas = await this.getAllBoletas.execute();
      res.json(boletas);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const boleta = await this.getBoletaById.execute(Number(req.params.id));
      res.json(boleta);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const boleta = await this.createBoleta.execute(req.body);
      res.status(201).json(boleta);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const boleta = await this.updateBoleta.execute(Number(req.params.id), req.body);
      res.json(boleta);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.deleteBoleta.execute(Number(req.params.id));
      res.json({ message: "Boleta eliminada correctamente" });
    } catch (error) {
      next(error);
    }
  };

  enviar = async (req, res, next) => {
    try {
      const boleta = await this.enviarBoleta.execute(Number(req.params.id));
      res.json({ message: "Boleta enviada correctamente", boleta });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { BoletaController };

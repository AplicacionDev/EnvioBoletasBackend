class NominaController {
  constructor({ getEmpresas, getEmpleadosPendientes, validarPlanilla, procesarBoletasPendientes }) {
    this.getEmpresas = getEmpresas;
    this.getEmpleadosPendientes = getEmpleadosPendientes;
    this.validarPlanilla = validarPlanilla;
    this.procesarBoletasPendientes = procesarBoletasPendientes;
  }

  /** GET /api/nomina/empresas */
  empresas = async (req, res, next) => {
    try {
      const empresas = await this.getEmpresas.execute();
      res.json(empresas);
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/nomina/pendientes */
  pendientes = async (req, res, next) => {
    try {
      const empleados = await this.getEmpleadosPendientes.execute();
      res.json({ total: empleados.length, empleados });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/nomina/validar-planilla?fecha=2026-04-01 */
  validar = async (req, res, next) => {
    try {
      const resultado = await this.validarPlanilla.execute(req.query.fecha);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  /** POST /api/nomina/procesar — Ejecuta el flujo completo */
  procesar = async (req, res, next) => {
    try {
      const resultado = await this.procesarBoletasPendientes.execute();
      res.json({
        ok: true,
        message: "Proceso de envío de boletas finalizado",
        ...resultado,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { NominaController };

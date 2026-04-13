class SchedulerController {
  constructor(schedulerService) {
    this.schedulerService = schedulerService;
  }

  /** GET /api/scheduler — Estado actual del scheduler */
  getStatus = (req, res) => {
    res.json(this.schedulerService.getStatus());
  };

  /** PUT /api/scheduler — Actualizar configuración */
  updateConfig = (req, res, next) => {
    try {
      const status = this.schedulerService.updateConfig(req.body);
      res.json({ ok: true, message: "Configuración actualizada", ...status });
    } catch (error) {
      next(error);
    }
  };

  /** POST /api/scheduler/run — Ejecutar a demanda */
  runNow = async (req, res, next) => {
    try {
      const result = await this.schedulerService.runNow();
      res.json({ ok: true, message: "Ejecución a demanda completada", ...result });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/scheduler/history — Historial de ejecuciones */
  getHistory = (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json(this.schedulerService.getHistory(limit));
  };
}

module.exports = { SchedulerController };

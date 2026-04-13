const { Router } = require("express");

function createEmpleadoRoutes(empleadoController) {
  const router = Router();

  router.get("/", empleadoController.getAll);
  router.get("/:id", empleadoController.getById);
  router.post("/", empleadoController.create);

  return router;
}

module.exports = { createEmpleadoRoutes };

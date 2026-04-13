const { Router } = require("express");

function createNominaRoutes(nominaController) {
  const router = Router();

  router.get("/empresas", nominaController.empresas);
  router.get("/pendientes", nominaController.pendientes);
  router.get("/validar-planilla", nominaController.validar);
  router.post("/procesar", nominaController.procesar);

  return router;
}

module.exports = { createNominaRoutes };

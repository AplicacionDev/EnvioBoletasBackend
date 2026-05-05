const { Router } = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");

function createNominaRoutes(nominaController) {
  const router = Router();

  // router.use(requireAuth); // TODO: reactivar cuando el SSO esté configurado

  router.get("/empresas", nominaController.empresas);
  router.get("/pendientes", nominaController.pendientes);
  router.get("/validar-planilla", nominaController.validar);
  router.post("/procesar", nominaController.procesar);

  return router;
}

module.exports = { createNominaRoutes };

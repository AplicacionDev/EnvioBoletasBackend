const { Router } = require("express");

function createBoletaRoutes(boletaController) {
  const router = Router();

  router.get("/", boletaController.getAll);
  router.get("/:id", boletaController.getById);
  router.post("/", boletaController.create);
  router.put("/:id", boletaController.update);
  router.delete("/:id", boletaController.delete);
  router.post("/:id/enviar", boletaController.enviar);

  return router;
}

module.exports = { createBoletaRoutes };

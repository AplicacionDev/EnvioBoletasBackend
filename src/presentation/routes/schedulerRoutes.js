const { Router } = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");

function createSchedulerRoutes(schedulerController) {
  const router = Router();

  // router.use(requireAuth); // TODO: reactivar cuando el SSO esté configurado

  router.get("/", schedulerController.getStatus);
  router.put("/", schedulerController.updateConfig);
  router.post("/run", schedulerController.runNow);
  router.get("/history", schedulerController.getHistory);

  return router;
}

module.exports = { createSchedulerRoutes };

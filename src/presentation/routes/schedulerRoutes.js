const { Router } = require("express");

function createSchedulerRoutes(schedulerController) {
  const router = Router();

  router.get("/", schedulerController.getStatus);
  router.put("/", schedulerController.updateConfig);
  router.post("/run", schedulerController.runNow);
  router.get("/history", schedulerController.getHistory);

  return router;
}

module.exports = { createSchedulerRoutes };

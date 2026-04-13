const express = require("express");
const cors = require("cors");

// Infrastructure
const { MssqlBoletaQueryRepository } = require("../infrastructure/repositories/MssqlBoletaQueryRepository");
const { SmtpMailService } = require("../infrastructure/services/SmtpMailService");
const { BoletaTemplateService } = require("../infrastructure/services/BoletaTemplateService");
const { PdfService } = require("../infrastructure/services/PdfService");

// Use Cases
const { GetEmpresas } = require("../application/use-cases/GetEmpresas");
const { GetEmpleadosPendientes } = require("../application/use-cases/GetEmpleadosPendientes");
const { ValidarPlanilla } = require("../application/use-cases/ValidarPlanilla");
const { ProcesarBoletasPendientes } = require("../application/use-cases/ProcesarBoletasPendientes");

// Controller
const { NominaController } = require("./controllers/NominaController");
const { SchedulerController } = require("./controllers/SchedulerController");

// Routes
const { createNominaRoutes } = require("./routes/nominaRoutes");
const { createSchedulerRoutes } = require("./routes/schedulerRoutes");

// Scheduler
const { SchedulerService } = require("../infrastructure/services/SchedulerService");

// Middleware
const { errorHandler } = require("./middlewares/errorHandler");

function createApp() {
  const app = express();

  // Middlewares globales
  app.use(cors());
  app.use(express.json());

  // Infrastructure (dependency injection)
  const boletaQueryRepository = new MssqlBoletaQueryRepository();
  const mailService = new SmtpMailService();
  const templateService = new BoletaTemplateService();
  const pdfService = new PdfService();

  // Use Cases
  const getEmpresas = new GetEmpresas(boletaQueryRepository);
  const getEmpleadosPendientes = new GetEmpleadosPendientes(boletaQueryRepository);
  const validarPlanilla = new ValidarPlanilla(boletaQueryRepository);
  const procesarBoletasPendientes = new ProcesarBoletasPendientes({
    boletaQueryRepository,
    mailService,
    templateService,
    pdfService,
  });

  // Controller
  const nominaController = new NominaController({
    getEmpresas,
    getEmpleadosPendientes,
    validarPlanilla,
    procesarBoletasPendientes,
  });

  // Scheduler
  const schedulerService = new SchedulerService(procesarBoletasPendientes);
  const schedulerController = new SchedulerController(schedulerService);

  // Routes
  app.use("/api/nomina", createNominaRoutes(nominaController));
  app.use("/api/scheduler", createSchedulerRoutes(schedulerController));

  // Iniciar scheduler al crear la app
  schedulerService.start();

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ ok: true, message: "API Envío de Boletas funcionando" });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

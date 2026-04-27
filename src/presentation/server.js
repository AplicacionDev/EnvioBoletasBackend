const express = require("express");
const cors = require("cors");

// Infrastructure
const { MssqlBoletaQueryRepository } = require("../infrastructure/repositories/MssqlBoletaQueryRepository");
const { SmtpMailService } = require("../infrastructure/services/SmtpMailService");
const { GraphMailService } = require("../infrastructure/services/GraphMailService");
const { BoletaTemplateService } = require("../infrastructure/services/BoletaTemplateService");
const { PdfService } = require("../infrastructure/services/PdfService");
const { checkDatabaseConnection } = require("../infrastructure/database/db");
const { getDatabaseDiagnostics } = require("../infrastructure/database/db");
const { envs } = require("../config/envs");

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
const { requestLogger } = require("./middlewares/requestLogger");

function createApp() {
  const app = express();

  // Middlewares globales
  app.use(cors());
  app.use(requestLogger);
  app.use(express.json());

  // Infrastructure (dependency injection)
  const boletaQueryRepository = new MssqlBoletaQueryRepository();
  const mailService = envs.MAIL_PROVIDER === "graph" ? new GraphMailService() : new SmtpMailService();
  const templateService = new BoletaTemplateService();
  const pdfService = new PdfService();

  console.log(`[Mail] Proveedor configurado: ${envs.MAIL_PROVIDER}`);

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
  app.get("/api/health", async (req, res) => {
    const db = await checkDatabaseConnection();
    const ok = db.ok;

    res.status(ok ? 200 : 503).json({
      ok,
      message: ok
        ? "API Envío de Boletas funcionando"
        : "API funcionando, pero la base de datos no está disponible",
      database: db,
    });
  });

  // Health detallado para diagnóstico con DBA (sin exponer contraseña)
  app.get("/api/health/db-diagnostics", async (req, res) => {
    const diagnostics = await getDatabaseDiagnostics();
    res.status(diagnostics.database.ok ? 200 : 503).json(diagnostics);
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

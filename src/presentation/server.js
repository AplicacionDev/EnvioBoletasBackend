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
const { createAuthRoutes } = require("./routes/authRoutes");

// Scheduler
const { SchedulerService } = require("../infrastructure/services/SchedulerService");

// Middleware
const { errorHandler } = require("./middlewares/errorHandler");
const { requestLogger } = require("./middlewares/requestLogger");

function createMailService() {
  const smtpMailService = new SmtpMailService();

  if (envs.MAIL_PROVIDER !== "graph") {
    return smtpMailService;
  }

  const graphMailService = new GraphMailService();

  if (!envs.MAIL_GRAPH_FALLBACK_TO_SMTP) {
    return graphMailService;
  }

  return {
    async sendMail(htmlBody, asunto, destinatario, filePath) {
      try {
        await graphMailService.sendMail(htmlBody, asunto, destinatario, filePath);
      } catch (error) {
        console.warn(
          `[Mail] Graph falló (${error.message}). Fallback a SMTP para ${destinatario}...`
        );
        await smtpMailService.sendMail(htmlBody, asunto, destinatario, filePath);
      }
    },
  };
}

function createApp() {
  const app = express();

  // Middlewares globales
  app.use(cors());
  app.use(requestLogger);
  app.use(express.json());

  // Infrastructure (dependency injection)
  const boletaQueryRepository = new MssqlBoletaQueryRepository();
  const mailService = createMailService();
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
  app.use("/api/auth", createAuthRoutes());
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

  // Diagnóstico de SP previo al envío (sin ejecutar todo el flujo de boletas)
  const runPreEnvioSpDiagnostic = async (req, res, next) => {
    try {
      if (!envs.PRE_ENVIO_SP) {
        return res.status(400).json({
          ok: false,
          message: "PRE_ENVIO_SP no está configurado",
        });
      }

      const startedAt = new Date();
      await boletaQueryRepository.ejecutarPreparacionPendientes();

      return res.json({
        ok: true,
        message: "PRE_ENVIO_SP ejecutado correctamente",
        sp: envs.PRE_ENVIO_SP,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  app.get("/api/health/pre-envio-sp", runPreEnvioSpDiagnostic);
  app.post("/api/health/pre-envio-sp", runPreEnvioSpDiagnostic);

  // Error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

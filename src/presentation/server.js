const express = require("express");
const cors = require("cors");

// Infrastructure
const { MssqlBoletaRepository } = require("../infrastructure/repositories/MssqlBoletaRepository");
const { MssqlEmpleadoRepository } = require("../infrastructure/repositories/MssqlEmpleadoRepository");

// Use Cases - Boleta
const { GetAllBoletas } = require("../application/use-cases/boleta/GetAllBoletas");
const { GetBoletaById } = require("../application/use-cases/boleta/GetBoletaById");
const { CreateBoleta } = require("../application/use-cases/boleta/CreateBoleta");
const { UpdateBoleta } = require("../application/use-cases/boleta/UpdateBoleta");
const { DeleteBoleta } = require("../application/use-cases/boleta/DeleteBoleta");
const { EnviarBoleta } = require("../application/use-cases/boleta/EnviarBoleta");

// Use Cases - Empleado
const { GetAllEmpleados } = require("../application/use-cases/empleado/GetAllEmpleados");
const { GetEmpleadoById } = require("../application/use-cases/empleado/GetEmpleadoById");
const { CreateEmpleado } = require("../application/use-cases/empleado/CreateEmpleado");

// Controllers
const { BoletaController } = require("./controllers/BoletaController");
const { EmpleadoController } = require("./controllers/EmpleadoController");

// Routes
const { createBoletaRoutes } = require("./routes/boletaRoutes");
const { createEmpleadoRoutes } = require("./routes/empleadoRoutes");

// Middleware
const { errorHandler } = require("./middlewares/errorHandler");

function createApp() {
  const app = express();

  // Middlewares globales
  app.use(cors());
  app.use(express.json());

  // Repositories (dependency injection)
  const boletaRepository = new MssqlBoletaRepository();
  const empleadoRepository = new MssqlEmpleadoRepository();

  // Use Cases
  const getAllBoletas = new GetAllBoletas(boletaRepository);
  const getBoletaById = new GetBoletaById(boletaRepository);
  const createBoleta = new CreateBoleta(boletaRepository);
  const updateBoleta = new UpdateBoleta(boletaRepository);
  const deleteBoleta = new DeleteBoleta(boletaRepository);
  const enviarBoleta = new EnviarBoleta(boletaRepository);

  const getAllEmpleados = new GetAllEmpleados(empleadoRepository);
  const getEmpleadoById = new GetEmpleadoById(empleadoRepository);
  const createEmpleado = new CreateEmpleado(empleadoRepository);

  // Controllers
  const boletaController = new BoletaController({
    getAllBoletas,
    getBoletaById,
    createBoleta,
    updateBoleta,
    deleteBoleta,
    enviarBoleta,
  });

  const empleadoController = new EmpleadoController({
    getAllEmpleados,
    getEmpleadoById,
    createEmpleado,
  });

  // Routes
  app.use("/api/boletas", createBoletaRoutes(boletaController));
  app.use("/api/empleados", createEmpleadoRoutes(empleadoController));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ ok: true, message: "API Envío de Boletas funcionando" });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

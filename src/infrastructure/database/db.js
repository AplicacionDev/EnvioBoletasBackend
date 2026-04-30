const sql = require("mssql");
const net = require("net");
const os = require("os");
const fs = require("fs");
const { envs } = require("../../config/envs");

const dbAppName = envs.DB_APP_NAME || "EnvioBoletas";

const dbConfig = {
  server: envs.DB_SERVER,
  database: envs.DB_DATABASE,
  user: envs.DB_USER,
  password: envs.DB_PASSWORD,
  port: envs.DB_PORT,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: envs.DB_ENCRYPT,
    trustServerCertificate: envs.DB_TRUST_SERVER_CERTIFICATE,
    appName: dbAppName,
  },
  connectionTimeout: 5000,
  requestTimeout: 5000,
};

let pool = null;

async function getConnection() {
  if (pool) return pool;

  try {
    pool = await sql.connect(dbConfig);
    console.log("Conexion a SQL Server establecida usando mssql (tedious)");
    return pool;
  } catch (error) {
    console.error("Error al conectar a SQL Server:", error.message);
    throw error;
  }
}

async function checkDatabaseConnection() {
  const timeoutMs = 5000;

  try {
    const currentPool = await Promise.race([
      getConnection(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout al conectar a SQL Server después de ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);

    await Promise.race([
      currentPool.request().query("SELECT 1 AS ok"),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout al validar SQL Server después de ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);

    return {
      ok: true,
      message: "Conexión a SQL Server disponible",
      database: envs.DB_DATABASE,
      server: envs.DB_SERVER,
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message,
      database: envs.DB_DATABASE,
      server: envs.DB_SERVER,
    };
  }
}

async function checkTcpConnection(host, port = 1433, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => finish({ ok: true, message: `TCP ${host}:${port} disponible` }));
    socket.on("timeout", () => finish({ ok: false, message: `Timeout TCP a ${host}:${port} (${timeoutMs} ms)` }));
    socket.on("error", (error) => finish({ ok: false, message: error.message }));
  });
}

async function getDatabaseDiagnostics() {
  const tcp = await checkTcpConnection(envs.DB_SERVER, 1433, 3000);
  const database = await checkDatabaseConnection();

  const diagnostics = {
    timestamp: new Date().toISOString(),
    runtime: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      hostname: os.hostname(),
      isContainer: fs.existsSync("/.dockerenv"),
    },
    target: {
      server: envs.DB_SERVER,
      database: envs.DB_DATABASE,
      user: envs.DB_USER,
      driver: "tedious (mssql)",
      appName: envs.DB_APP_NAME || null,
    },
    network: {
      tcp1433: tcp,
    },
    database,
  };

  if (!database.ok) return diagnostics;

  try {
    const currentPool = await getConnection();
    const result = await currentPool.request().query(
      `SELECT
         HOST_NAME() AS hostName,
         APP_NAME() AS appName,
         SUSER_SNAME() AS loginName,
         ORIGINAL_LOGIN() AS originalLogin,
         @@SPID AS sessionId`
    );

    diagnostics.sqlContext = result.recordset?.[0] || null;
  } catch (error) {
    diagnostics.sqlContext = { error: error.message };
  }

  return diagnostics;
}

module.exports = { getConnection, checkDatabaseConnection, getDatabaseDiagnostics, sql };

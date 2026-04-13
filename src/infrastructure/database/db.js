const { envs } = require("../../config/envs");

// msnodesqlv8 is Windows-only; fall back to tedious (default mssql driver) on Linux/Docker
let sql;
let useNativeDriver = false;
try {
  sql = require("mssql/msnodesqlv8");
  useNativeDriver = true;
} catch {
  sql = require("mssql");
}

const dbConfig = {
  server: envs.DB_SERVER,
  database: envs.DB_DATABASE,
  ...(useNativeDriver ? { driver: "msnodesqlv8" } : {}),
  options: {
    trustedConnection: false,
    encrypt: false,
    trustServerCertificate: true,
  },
  user: envs.DB_USER,
  password: envs.DB_PASSWORD,
};

let pool = null;

async function getConnection() {
  if (pool) return pool;

  try {
    pool = await sql.connect(dbConfig);
    console.log("Conexión a SQL Server establecida");
    return pool;
  } catch (error) {
    console.error("Error al conectar a SQL Server:", error.message);
    throw error;
  }
}

module.exports = { getConnection, sql };

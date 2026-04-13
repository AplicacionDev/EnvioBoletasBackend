const sql = require("mssql/msnodesqlv8");
const { envs } = require("../../config/envs");

const dbConfig = {
  server: envs.DB_SERVER,
  database: envs.DB_DATABASE,
  driver: "msnodesqlv8",
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

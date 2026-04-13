const sql = require("mssql");
const { envs } = require("../config/envs");

const dbConfig = {
  server: envs.DB_SERVER,
  database: envs.DB_DATABASE,
  user: envs.DB_USER,
  password: envs.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
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

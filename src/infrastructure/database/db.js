const sql = require("mssql/msnodesqlv8");
const { envs } = require("../../config/envs");

const odbcDriver = envs.DB_ODBC_DRIVER || "ODBC Driver 18 for SQL Server";

const dbConfig = {
  driver: "msnodesqlv8",
  connectionString:
    `Driver={${odbcDriver}};` +
    `Server=${envs.DB_SERVER};` +
    `Database=${envs.DB_DATABASE};` +
    `Uid=${envs.DB_USER};` +
    `Pwd=${envs.DB_PASSWORD};` +
    "Encrypt=no;" +
    "TrustServerCertificate=yes;",
  options: {
    trustedConnection: false,
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

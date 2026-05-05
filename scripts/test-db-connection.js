/**
 * Script de diagnóstico de conexión a SQL Server
 * Uso: node scripts/test-db-connection.js
 */

require("dotenv").config();
const net = require("net");

// ─── Helpers ────────────────────────────────────────────────────────────────

function ok(msg)   { console.log(`  ✔  ${msg}`); }
function fail(msg) { console.error(`  ✘  ${msg}`); }
function info(msg) { console.log(`  ℹ  ${msg}`); }
function section(title) { console.log(`\n── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`); }

function envVal(key) {
  const v = process.env[key];
  if (!v) return "(no definido)";
  if (key.toLowerCase().includes("password") || key.toLowerCase().includes("secret")) {
    return v.length > 0 ? "****** (definido)" : "(vacío)";
  }
  return v;
}

// ─── 1. Variables de entorno ─────────────────────────────────────────────────

section("1. Variables de entorno");

const required = ["DB_SERVER", "DB_DATABASE", "DB_USER", "DB_PASSWORD"];
const optional = ["DB_PORT", "DB_DRIVER", "DB_ODBC_DRIVER", "DB_ENCRYPT", "DB_TRUST_SERVER_CERTIFICATE", "DB_APP_NAME"];

let missingRequired = false;
for (const key of required) {
  if (!process.env[key]) {
    fail(`${key} = ${envVal(key)}  ← REQUERIDA`);
    missingRequired = true;
  } else {
    ok(`${key} = ${envVal(key)}`);
  }
}
for (const key of optional) {
  info(`${key} = ${envVal(key)}`);
}

if (missingRequired) {
  console.error("\nFaltan variables requeridas. Revisa tu archivo .env antes de continuar.");
  process.exit(1);
}

// ─── 2. Alcance de red (TCP ping) ────────────────────────────────────────────

async function tcpPing(host, port, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => done({ ok: true }));
    socket.on("error", (err) => done({ ok: false, error: err.message }));
    socket.on("timeout", () => done({ ok: false, error: `Timeout tras ${timeoutMs} ms` }));
  });
}

async function checkNetwork() {
  section("2. Alcance de red (TCP)");

  const server = process.env.DB_SERVER;
  const port   = Number(process.env.DB_PORT) || 1433;

  // Separar instancia del host si viene como HOST\INSTANCIA
  const host = server.split("\\")[0];

  info(`Host: ${host}   Puerto: ${port}`);

  const result = await tcpPing(host, port);
  if (result.ok) {
    ok(`TCP ${host}:${port} alcanzable`);
    return true;
  } else {
    fail(`TCP ${host}:${port} NO alcanzable — ${result.error}`);
    info("Posibles causas: firewall, SQL Browser desactivado, puerto incorrecto, servidor apagado.");
    return false;
  }
}

// ─── 3. Carga del driver ─────────────────────────────────────────────────────

function loadDriver() {
  section("3. Driver de conexión");

  const requested = (process.env.DB_DRIVER || "auto").toLowerCase();
  const isWin     = process.platform === "win32";

  info(`DB_DRIVER solicitado: ${requested}   (plataforma: ${process.platform})`);

  const useMsNode =
    requested === "msnodesqlv8" ||
    (requested === "auto" && isWin);

  if (useMsNode) {
    try {
      const sql = require("mssql/msnodesqlv8");
      ok("mssql/msnodesqlv8 cargado correctamente");
      return { sql, selected: "msnodesqlv8" };
    } catch (e) {
      fail(`No se pudo cargar msnodesqlv8: ${e.message}`);
      info("Recayendo en tedious…");
    }
  }

  try {
    const sql = require("mssql");
    ok("mssql (tedious) cargado correctamente");
    return { sql, selected: "tedious" };
  } catch (e) {
    fail(`No se pudo cargar mssql: ${e.message}`);
    return null;
  }
}

// ─── 4. Conexión y consulta básica ──────────────────────────────────────────

async function checkSqlConnection(sql, driverName) {
  section("4. Conexión a SQL Server");

  const dbAppName = process.env.DB_APP_NAME || "EnvioBoletas-Test";

  let config;
  if (driverName === "msnodesqlv8") {
    const odbcDriver = process.env.DB_ODBC_DRIVER || "ODBC Driver 18 for SQL Server";
    config = {
      driver: "msnodesqlv8",
      connectionString:
        `Driver={${odbcDriver}};` +
        `Server=${process.env.DB_SERVER};` +
        `Database=${process.env.DB_DATABASE};` +
        `Uid=${process.env.DB_USER};` +
        `Pwd=${process.env.DB_PASSWORD};` +
        `APP=${dbAppName};` +
        `Encrypt=${process.env.DB_ENCRYPT === "true" ? "yes" : "no"};` +
        `TrustServerCertificate=${process.env.DB_TRUST_SERVER_CERTIFICATE !== "false" ? "yes" : "no"};`,
      options: {
        trustedConnection: false,
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
      },
      connectionTimeout: 8000,
      requestTimeout:    8000,
    };
    info(`ODBC driver: ${odbcDriver}`);
  } else {
    config = {
      server:   process.env.DB_SERVER,
      database: process.env.DB_DATABASE,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port:     Number(process.env.DB_PORT) || 1433,
      options: {
        encrypt:                 process.env.DB_ENCRYPT === "true",
        trustServerCertificate:  process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
        appName:                 dbAppName,
      },
      connectionTimeout: 8000,
      requestTimeout:    8000,
    };
  }

  info(`Conectando a [${process.env.DB_SERVER}].[${process.env.DB_DATABASE}] como "${process.env.DB_USER}"…`);

  let pool;
  try {
    pool = await sql.connect(config);
    ok("Conexión establecida");
  } catch (e) {
    fail(`Error al conectar: ${e.message}`);
    return false;
  }

  // ── Consulta de sanidad ──
  section("5. Consultas de diagnóstico");
  try {
    const r1 = await pool.request().query("SELECT @@VERSION AS version, GETDATE() AS server_time, DB_NAME() AS db_name, SUSER_SNAME() AS login");
    const row = r1.recordset[0];
    ok(`Base de datos activa : ${row.db_name}`);
    ok(`Login conectado      : ${row.login}`);
    ok(`Hora del servidor    : ${row.server_time}`);
    info(`Versión SQL Server   :\n     ${row.version.split("\n")[0]}`);
  } catch (e) {
    fail(`Error en SELECT @@VERSION: ${e.message}`);
  }

  // ── Permisos de lectura ──
  try {
    await pool.request().query("SELECT TOP 1 1 FROM sys.tables");
    ok("Permiso SELECT sobre sys.tables: OK");
  } catch (e) {
    fail(`Sin acceso a sys.tables: ${e.message}`);
  }

  // ── Stored procedures configurados ──
  const sp = process.env.PRE_ENVIO_SP;
  if (sp) {
    section("6. Verificación de Stored Procedure");
    info(`PRE_ENVIO_SP = ${sp}`);
    try {
      const r2 = await pool.request().query(
        `SELECT OBJECT_ID('${sp}', 'P') AS sp_id`
      );
      const spId = r2.recordset[0]?.sp_id;
      if (spId) {
        ok(`Stored procedure "${sp}" encontrado (object_id: ${spId})`);
      } else {
        fail(`Stored procedure "${sp}" NO encontrado en la base de datos`);
      }
    } catch (e) {
      fail(`Error al verificar SP: ${e.message}`);
    }
  }

  await pool.close();
  ok("Pool cerrado correctamente");
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  console.log("═".repeat(55));
  console.log(" TEST DE CONEXIÓN A SQL SERVER");
  console.log("═".repeat(55));

  const networkOk = await checkNetwork();
  if (!networkOk) {
    console.log("\n⚠  La red no está disponible. Se intentará la conexión de todas formas…");
  }

  const driverResult = loadDriver();
  if (!driverResult) {
    console.error("\nNo se pudo cargar ningún driver de base de datos. Verifica que mssql esté instalado (pnpm install).");
    process.exit(1);
  }

  const sqlOk = await checkSqlConnection(driverResult.sql, driverResult.selected);

  console.log("\n" + "═".repeat(55));
  if (sqlOk) {
    console.log(" RESULTADO: CONEXIÓN EXITOSA ✔");
  } else {
    console.log(" RESULTADO: CONEXIÓN FALLIDA ✘");
    process.exit(1);
  }
  console.log("═".repeat(55) + "\n");
})();

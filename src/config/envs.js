require("dotenv").config();

const envs = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // SQL Server
  DB_SERVER: process.env.DB_SERVER,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_ODBC_DRIVER: process.env.DB_ODBC_DRIVER || "ODBC Driver 18 for SQL Server",
  DB_APP_NAME: process.env.DB_APP_NAME || "EnvioBoletas",

  // SMTP
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM: process.env.SMTP_FROM,

  // Mail provider
  MAIL_PROVIDER: (process.env.MAIL_PROVIDER || "smtp").toLowerCase(),
  MAIL_THROTTLE_MS: Number(process.env.MAIL_THROTTLE_MS) || 3000,
  MAIL_BATCH_SIZE: Number(process.env.MAIL_BATCH_SIZE) || 100,
  MAIL_BATCH_PAUSE_MS: Number(process.env.MAIL_BATCH_PAUSE_MS) || 120000,
  MAIL_MAX_RETRIES: Number(process.env.MAIL_MAX_RETRIES) || 2,
  MAIL_RETRY_BASE_MS: Number(process.env.MAIL_RETRY_BASE_MS) || 2000,
  MAIL_PER_MINUTE_LIMIT: Number(process.env.MAIL_PER_MINUTE_LIMIT) || 20,

  // Microsoft Graph
  GRAPH_CLIENT_ID: process.env.GRAPH_CLIENT_ID,
  GRAPH_CLIENT_SECRET: process.env.GRAPH_CLIENT_SECRET,
  GRAPH_TENANT_ID: process.env.GRAPH_TENANT_ID,
  GRAPH_SEND_AS: process.env.GRAPH_SEND_AS,
};

module.exports = { envs };

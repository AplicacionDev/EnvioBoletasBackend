require("dotenv").config();

const envs = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // SQL Server
  DB_SERVER: process.env.DB_SERVER,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_APP_NAME: process.env.DB_APP_NAME || "EnvioBoletas",

  // SMTP
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM: process.env.SMTP_FROM,

  // Microsoft Graph
  GRAPH_CLIENT_ID: process.env.GRAPH_CLIENT_ID,
  GRAPH_CLIENT_SECRET: process.env.GRAPH_CLIENT_SECRET,
  GRAPH_TENANT_ID: process.env.GRAPH_TENANT_ID,
  GRAPH_SEND_AS: process.env.GRAPH_SEND_AS,
};

module.exports = { envs };

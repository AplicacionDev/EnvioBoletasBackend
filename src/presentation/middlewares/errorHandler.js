function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Error interno del servidor";

  const requestId = req.requestId || req.headers["x-request-id"] || "n/a";
  console.error(
    `[ERROR] ${req.method} ${req.originalUrl} status=${statusCode} rid=${requestId} message=\"${message}\"`
  );

  res.status(statusCode).json({
    ok: false,
    message,
    requestId,
    errors: err.errors || undefined,
  });
}

module.exports = { errorHandler };

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const requestId = req.headers["x-request-id"] || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const elapsedNs = process.hrtime.bigint() - start;
    const elapsedMs = Number(elapsedNs / 1000000n);
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "unknown";

    console.log(
      `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs}ms ip=${ip} rid=${requestId} ua=\"${userAgent}\"`
    );
  });

  next();
}

module.exports = { requestLogger };
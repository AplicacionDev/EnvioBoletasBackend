const jwt = require("jsonwebtoken");
const jwksRsa = require("jwks-rsa");
const { envs } = require("../../config/envs");

if (!envs.ENTRA_TENANT_ID || !envs.ENTRA_AUDIENCE) {
  console.warn("[Auth] ENTRA_TENANT_ID o ENTRA_AUDIENCE no están configurados.");
}

const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${envs.ENTRA_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutos
});

function getSigningKey(header, callback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Middleware que valida el token Bearer de Microsoft Entra ID.
 * El frontend debe enviar: Authorization: Bearer <access_token>
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "Token de acceso requerido." });
  }

  const token = authHeader.slice(7);

  const verifyOptions = {
    audience: envs.ENTRA_AUDIENCE,
    issuer: [
      `https://login.microsoftonline.com/${envs.ENTRA_TENANT_ID}/v2.0`,
      `https://sts.windows.net/${envs.ENTRA_TENANT_ID}/`,
    ],
    algorithms: ["RS256"],
  };

  jwt.verify(token, getSigningKey, verifyOptions, (err, decoded) => {
    if (err) {
      console.warn(`[Auth] Token inválido: ${err.message}`);
      return res.status(401).json({ ok: false, message: "Token inválido o expirado." });
    }

    // Adjuntar información del usuario al request
    req.user = {
      oid: decoded.oid,
      email: decoded.preferred_username || decoded.upn || decoded.email,
      name: decoded.name,
      roles: decoded.roles || [],
    };

    next();
  });
}

module.exports = { requireAuth };

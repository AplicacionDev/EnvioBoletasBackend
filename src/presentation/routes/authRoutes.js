const { Router } = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");

function createAuthRoutes() {
  const router = Router();

  /**
   * GET /api/auth/me
   * Devuelve la información del usuario autenticado.
   * El frontend llama a este endpoint para verificar sesión activa.
   */
  router.get("/me", requireAuth, (req, res) => {
    res.json({
      ok: true,
      user: req.user,
    });
  });

  return router;
}

module.exports = { createAuthRoutes };

const { createApp } = require("./presentation/server");
const { envs } = require("./config/envs");
const { getConnection } = require("./infrastructure/database/db");

const app = createApp();

app.listen(envs.PORT, async () => {
  console.log(`Server running on port ${envs.PORT}`);

  try {
    await getConnection();
    console.log("Base de datos lista");
  } catch (error) {
    console.error("No se pudo conectar a la base de datos:", error.message);
  }
});

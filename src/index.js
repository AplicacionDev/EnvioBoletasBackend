const { createApp } = require("./presentation/server");
const { envs } = require("./config/envs");

const app = createApp();

app.listen(envs.PORT, () => {
  console.log(`Server running on port ${envs.PORT}`);
});

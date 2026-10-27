import { criarApp } from "./app";
import { env } from "./config/env";

criarApp().listen(env.port, "0.0.0.0", () => {
  console.log(`API VITTA ouvindo na porta ${env.port}`);
});

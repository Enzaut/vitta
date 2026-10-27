import express from "express";
import { env } from "./config/env";
import { liberarOrigens } from "./middlewares/liberarOrigens";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/tratarErros";
import { rotas } from "./routes";

type Opcoes = {
  // Sites que podem chamar a API pelo navegador. Se não vier, usa a variável CORS_ORIGENS.
  origensPermitidas?: string[];
};

// Monta o app sem colocá-lo no ar (assim os testes podem usá-lo direto).
export function criarApp({ origensPermitidas = env.corsOrigens }: Opcoes = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(liberarOrigens(origensPermitidas));
  app.use(express.json({ limit: "10kb" }));
  app.use(rotas);
  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}

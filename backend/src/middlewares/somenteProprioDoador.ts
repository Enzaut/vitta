import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

// RNF-002: cada doador acessa e altera apenas os próprios dados.
//
// Vale para toda rota com o id de um doador no caminho (/doadores/:id e /doadores/:id/qualquer-coisa).
// O id só é aceito se for "me" ou o id do doador logado (o que está no token). Qualquer outro id
// recebe 403, exista ou não: assim a resposta também não revela quais ids existem.
//
// Além disso, os controllers nunca leem o id do caminho: usam sempre req.doadorId, que vem do token.
export function somenteProprioDoador(req: Request, _res: Response, next: NextFunction) {
  const id = req.params.id;
  if (id !== "me" && id !== req.doadorId) {
    throw new AppError(403, "Você não tem permissão para acessar os dados de outro doador.");
  }
  next();
}

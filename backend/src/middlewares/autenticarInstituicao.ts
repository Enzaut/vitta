import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { ContaInstituicaoRepository } from "../repositories/ContaInstituicaoRepository";
import { MSG_SESSAO_INVALIDA, lerCredencialDaRequisicao } from "./autenticar";

export const MSG_SO_INSTITUICAO = "Esta área é só para instituições.";

// Protege uma rota da instituição (RN-011 / RNF-002): sem token válido, 401; com token de doador, 403.
// Os controllers nunca leem o id da instituição do caminho: usam sempre req.contaInstituicaoId, que vem do token.
export async function autenticarInstituicao(req: Request, _res: Response, next: NextFunction) {
  const credencial = lerCredencialDaRequisicao(req);
  if (credencial.papel !== "instituicao") throw new AppError(403, MSG_SO_INSTITUICAO);
  if (!(await ContaInstituicaoRepository.existe(credencial.id))) throw new AppError(401, MSG_SESSAO_INVALIDA);

  req.contaInstituicaoId = credencial.id;
  next();
}

import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { DoadorService } from "../services/DoadorService";
import { lerCredencial } from "../utils/token";

export const MSG_SESSAO_INVALIDA = "Sessão inválida ou expirada. Faça login novamente.";
export const MSG_SO_DOADOR = "Esta área é só para doadores.";

// Lê o token do cabeçalho Authorization. Sem token ou com token inválido, devolve 401.
export function lerCredencialDaRequisicao(req: Request) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho?.startsWith("Bearer ")) {
    throw new AppError(401, "Autenticação obrigatória. Faça login para continuar.");
  }
  const credencial = lerCredencial(cabecalho.slice("Bearer ".length).trim());
  if (!credencial) throw new AppError(401, MSG_SESSAO_INVALIDA);
  return credencial;
}

// Protege uma rota do doador (RN-011 / RNF-003 / RNF-002): sem token válido, devolve 401; com token de instituição, 403.
// Também confere se o doador ainda existe: depois de excluir a conta, o token antigo para de valer.
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const credencial = lerCredencialDaRequisicao(req);
  if (credencial.papel !== "doador") throw new AppError(403, MSG_SO_DOADOR);
  if (!(await DoadorService.existe(credencial.id))) throw new AppError(401, MSG_SESSAO_INVALIDA);

  req.doadorId = credencial.id;
  next();
}

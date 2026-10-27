import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { DoadorService } from "../services/DoadorService";
import { lerToken } from "../utils/token";

const MSG_SESSAO_INVALIDA = "Sessão inválida ou expirada. Faça login novamente.";

// Protege uma rota (RN-011 / RNF-003): sem token válido, devolve 401.
// Também confere se o doador ainda existe: depois de excluir a conta, o token antigo para de valer.
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho?.startsWith("Bearer ")) {
    throw new AppError(401, "Autenticação obrigatória. Faça login para continuar.");
  }

  const doadorId = lerToken(cabecalho.slice("Bearer ".length).trim());
  if (!doadorId || !(await DoadorService.existe(doadorId))) {
    throw new AppError(401, MSG_SESSAO_INVALIDA);
  }

  req.doadorId = doadorId;
  next();
}

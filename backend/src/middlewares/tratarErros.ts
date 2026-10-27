import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export function rotaNaoEncontrada(_req: Request, res: Response) {
  res.status(404).json({ mensagem: "Rota não encontrada." });
}

// Último passo de toda requisição com erro: transforma o erro em uma resposta JSON.
export function tratarErros(erro: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (erro instanceof AppError) {
    res.status(erro.status).json({ mensagem: erro.message, ...(erro.campos && { campos: erro.campos }) });
    return;
  }

  // JSON mal formado no corpo da requisição.
  if (typeof erro === "object" && erro !== null && "type" in erro && erro.type === "entity.parse.failed") {
    res.status(400).json({ mensagem: "O corpo da requisição não é um JSON válido." });
    return;
  }

  console.error("Erro inesperado:", erro);
  res.status(500).json({ mensagem: "Erro interno. Tente novamente em instantes." });
}

import type { NextFunction, Request, Response } from "express";

// CORS: deixa a versão web do aplicativo (que fica em outro endereço da internet) conversar com a API.
// O app do celular não precisa disso. Como o login vai por token no cabeçalho (e não por cookie),
// liberar o endereço do site não abre brecha para outros sites agirem em nome da pessoa.
//
// origens: endereços liberados (ex.: "https://vitta-app-ucb.onrender.com") ou "*" para todos.
// Lista vazia = ninguém é liberado (o padrão).
export function liberarOrigens(origens: string[]) {
  const todas = origens.includes("*");

  return (req: Request, res: Response, next: NextFunction) => {
    const origem = req.header("origin");
    if (!origem || !(todas || origens.includes(origem))) {
      next();
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", todas ? "*" : origem);
    if (!todas) res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "600");

    // O navegador pergunta antes ("preflight") se pode enviar o pedido de verdade.
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
}

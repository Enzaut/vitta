import type { Request, Response } from "express";
import { GamificacaoService } from "../services/GamificacaoService";

// Rota protegida: o middleware autenticar preencheu req.doadorId e somenteProprioDoador já recusou o id de outro doador (RNF-002).
export const GamificacaoController = {
  async resumo(req: Request, res: Response) {
    res.json({ gamificacao: await GamificacaoService.resumo(req.doadorId!) });
  },
};

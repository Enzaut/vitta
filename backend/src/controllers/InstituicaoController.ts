import type { Request, Response } from "express";
import { InstituicaoService } from "../services/InstituicaoService";
import { validar } from "../validators/authValidator";
import { listarInstituicoesSchema } from "../validators/instituicaoValidator";

// Rotas protegidas: o middleware autenticar já conferiu o token (RN-011).
export const InstituicaoController = {
  async listar(req: Request, res: Response) {
    const filtro = validar(listarInstituicoesSchema, req.query);
    res.json(await InstituicaoService.listar(filtro));
  },

  async obter(req: Request, res: Response) {
    res.json({ instituicao: await InstituicaoService.obter(String(req.params.id)) });
  },
};

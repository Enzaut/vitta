import type { Request, Response } from "express";
import { DoadorService } from "../services/DoadorService";
import { validar } from "../validators/authValidator";
import { atualizarPerfilSchema } from "../validators/perfilValidator";

// Rotas protegidas: o middleware autenticar já preencheu req.doadorId.
export const DoadorController = {
  async perfil(req: Request, res: Response) {
    res.json({ doador: await DoadorService.obterPerfil(req.doadorId!) });
  },

  async atualizar(req: Request, res: Response) {
    const dados = validar(atualizarPerfilSchema, req.body);
    res.json({ doador: await DoadorService.atualizarPerfil(req.doadorId!, dados) });
  },

  async excluir(req: Request, res: Response) {
    await DoadorService.excluirConta(req.doadorId!);
    res.status(204).send();
  },
};

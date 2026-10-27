import type { Request, Response } from "express";
import { FormularioService } from "../services/FormularioService";

// Rotas protegidas: o middleware autenticar preencheu req.doadorId e somenteProprioDoador já recusou o id de outro doador.
export const FormularioController = {
  modelo(_req: Request, res: Response) {
    res.json({ modelo: FormularioService.modelo() });
  },

  async obter(req: Request, res: Response) {
    res.json({ formulario: await FormularioService.obterAtual(req.doadorId!) });
  },

  async enviar(req: Request, res: Response) {
    const formulario = await FormularioService.enviar(req.doadorId!, req.body?.respostas);
    res.status(201).json({ formulario });
  },
};

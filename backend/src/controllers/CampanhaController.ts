import type { Request, Response } from "express";
import { CampanhaService } from "../services/CampanhaService";
import { validar } from "../validators/authValidator";
import { listarCampanhasSchema } from "../validators/campanhaValidator";

// Rota do doador (o middleware autenticar já conferiu o token): as campanhas ativas das instituições.
export const CampanhaController = {
  async listar(req: Request, res: Response) {
    const filtro = validar(listarCampanhasSchema, req.query);
    res.json(await CampanhaService.listarParaDoador(req.doadorId!, filtro));
  },
};

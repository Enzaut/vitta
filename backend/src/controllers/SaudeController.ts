import type { Request, Response } from "express";
import { SaudeService } from "../services/SaudeService";

export const SaudeController = {
  raiz(_req: Request, res: Response) {
    res.send("API VITTA no ar");
  },

  async health(_req: Request, res: Response) {
    const resultado = await SaudeService.verificar();
    res.status(resultado.status === "ok" ? 200 : 503).json(resultado);
  },
};

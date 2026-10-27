import type { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { cadastroSchema, loginSchema, validar } from "../validators/authValidator";

// A controller só traduz HTTP: valida o corpo, chama o service e escolhe o status da resposta.
export const AuthController = {
  async cadastrar(req: Request, res: Response) {
    const dados = validar(cadastroSchema, req.body);
    res.status(201).json(await AuthService.cadastrar(dados));
  },

  async login(req: Request, res: Response) {
    const dados = validar(loginSchema, req.body);
    res.json(await AuthService.login(dados));
  },
};

import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { ContaInstituicaoController } from "../controllers/ContaInstituicaoController";

export const authRoutes = Router();

authRoutes.post("/cadastro", AuthController.cadastrar);
authRoutes.post("/login", AuthController.login);

// Conta da instituição (Iteração 5): o token dela leva o papel "instituicao".
authRoutes.post("/instituicao/cadastro", ContaInstituicaoController.cadastrar);
authRoutes.post("/instituicao/login", ContaInstituicaoController.login);

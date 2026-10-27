import { Router } from "express";
import { SaudeController } from "../controllers/SaudeController";
import { authRoutes } from "./authRoutes";
import { doadorRoutes } from "./doadorRoutes";
import { instituicaoRoutes } from "./instituicaoRoutes";

export const rotas = Router();

rotas.get("/", SaudeController.raiz);
rotas.get("/health", SaudeController.health);
rotas.use("/auth", authRoutes);
rotas.use("/doadores", doadorRoutes);
rotas.use("/instituicoes", instituicaoRoutes);

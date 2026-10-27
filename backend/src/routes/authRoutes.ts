import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

export const authRoutes = Router();

authRoutes.post("/cadastro", AuthController.cadastrar);
authRoutes.post("/login", AuthController.login);

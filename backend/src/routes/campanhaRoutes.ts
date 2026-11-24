import { Router } from "express";
import { CampanhaController } from "../controllers/CampanhaController";
import { autenticar } from "../middlewares/autenticar";

// O doador vê as campanhas ativas das instituições. Só quem está logado como doador (RN-011).
export const campanhaRoutes = Router();

campanhaRoutes.use(autenticar);
campanhaRoutes.get("/", CampanhaController.listar);

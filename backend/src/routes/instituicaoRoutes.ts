import { Router } from "express";
import { AgendamentoController } from "../controllers/AgendamentoController";
import { InstituicaoController } from "../controllers/InstituicaoController";
import { autenticar } from "../middlewares/autenticar";

export const instituicaoRoutes = Router();

// Só quem está logado vê o mapa (RN-011). As instituições são iguais para todos os doadores.
instituicaoRoutes.use(autenticar);

instituicaoRoutes.get("/", InstituicaoController.listar);
instituicaoRoutes.get("/:id", InstituicaoController.obter);
// HU-04: os médicos da instituição e os horários livres e ocupados dos próximos dias.
instituicaoRoutes.get("/:id/agenda", AgendamentoController.agenda);

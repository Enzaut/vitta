import { Router } from "express";
import { DoadorController } from "../controllers/DoadorController";
import { FormularioController } from "../controllers/FormularioController";
import { autenticar } from "../middlewares/autenticar";
import { somenteProprioDoador } from "../middlewares/somenteProprioDoador";

export const doadorRoutes = Router();

// Tudo aqui exige token JWT válido (RN-011 / RNF-003)...
doadorRoutes.use(autenticar);
// ...e qualquer rota com id de doador só vale para o próprio doador (RNF-002).
// Rotas novas com /:id/... (ex.: o formulário de análise) já nascem protegidas por esta linha.
doadorRoutes.use("/:id", somenteProprioDoador);

// O id pode ser "me" ou o id do próprio doador. Não há rota que liste todos os doadores.
doadorRoutes.get("/:id", DoadorController.perfil);
doadorRoutes.patch("/:id", DoadorController.atualizar);
doadorRoutes.delete("/:id", DoadorController.excluir);

// HU-03: formulário de análise para candidato a doação (só o do próprio doador, pela linha do RNF-002 acima).
doadorRoutes.get("/:id/formulario/modelo", FormularioController.modelo);
doadorRoutes.get("/:id/formulario", FormularioController.obter);
doadorRoutes.post("/:id/formulario", FormularioController.enviar);

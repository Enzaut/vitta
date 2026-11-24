import { Router } from "express";
import { ContaInstituicaoController } from "../controllers/ContaInstituicaoController";
import { autenticarInstituicao } from "../middlewares/autenticarInstituicao";

// Painel da instituição. Tudo aqui exige token com papel "instituicao" (RN-011 / RNF-002).
// Não há id de instituição no caminho: "me" é sempre a conta do token, então uma instituição nunca alcança outra.
export const contaInstituicaoRoutes = Router();

contaInstituicaoRoutes.use(autenticarInstituicao);

contaInstituicaoRoutes.get("/me", ContaInstituicaoController.minha);
contaInstituicaoRoutes.delete("/me", ContaInstituicaoController.excluir);

// Pedido de inclusão no mapa. A decisão é simulada enquanto não houver administrador do VITTA.
contaInstituicaoRoutes.post("/me/solicitacao", ContaInstituicaoController.solicitarInclusao);
contaInstituicaoRoutes.post("/me/solicitacao/simular-decisao", ContaInstituicaoController.simularDecisao);

// Instituição já aprovada: telefone, horário e estoque (tipos em falta).
contaInstituicaoRoutes.patch("/me/dados", ContaInstituicaoController.atualizarDados);
contaInstituicaoRoutes.patch("/me/estoque", ContaInstituicaoController.atualizarEstoque);

// Campanhas relâmpago da própria instituição.
contaInstituicaoRoutes.get("/me/campanhas", ContaInstituicaoController.listarCampanhas);
contaInstituicaoRoutes.post("/me/campanhas", ContaInstituicaoController.criarCampanha);
contaInstituicaoRoutes.patch("/me/campanhas/:campanhaId", ContaInstituicaoController.atualizarCampanha);
contaInstituicaoRoutes.post("/me/campanhas/:campanhaId/encerrar", ContaInstituicaoController.encerrarCampanha);
contaInstituicaoRoutes.delete("/me/campanhas/:campanhaId", ContaInstituicaoController.excluirCampanha);

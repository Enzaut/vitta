import type { Request, Response } from "express";
import { AgendamentoService } from "../services/AgendamentoService";
import { listarAgendamentosSchema } from "../validators/agendamentoValidator";
import { validar } from "../validators/authValidator";

// Rotas protegidas: o middleware autenticar preencheu req.doadorId e, nas rotas de /doadores/:id,
// somenteProprioDoador já recusou o id de outro doador (RNF-002). O id do doador sempre vem do token.
export const AgendamentoController = {
  // HU-04: médicos e horários (livres e ocupados) de uma instituição. É a mesma agenda para todos os doadores.
  async agenda(req: Request, res: Response) {
    res.json(await AgendamentoService.agenda(String(req.params.id)));
  },

  async listar(req: Request, res: Response) {
    const { status } = validar(listarAgendamentosSchema, req.query);
    res.json({ agendamentos: await AgendamentoService.listar(req.doadorId!, status) });
  },

  async proximo(req: Request, res: Response) {
    res.json({ agendamento: await AgendamentoService.proximo(req.doadorId!) });
  },

  async agendar(req: Request, res: Response) {
    res.status(201).json(await AgendamentoService.agendar(req.doadorId!, req.body));
  },

  async cancelar(req: Request, res: Response) {
    res.json(await AgendamentoService.cancelar(req.doadorId!, String(req.params.agendamentoId)));
  },

  // Só na demonstração: faz o papel da instituição confirmando que a doação aconteceu.
  async simularDoacao(req: Request, res: Response) {
    res.json(await AgendamentoService.simularDoacao(req.doadorId!, String(req.params.agendamentoId)));
  },
};

import type { Request, Response } from "express";
import { AuthInstituicaoService } from "../services/AuthInstituicaoService";
import { CampanhaService } from "../services/CampanhaService";
import { ContaInstituicaoService } from "../services/ContaInstituicaoService";
import { loginSchema, validar } from "../validators/authValidator";
import { atualizarCampanhaSchema, criarCampanhaSchema } from "../validators/campanhaValidator";
import {
  cadastroInstituicaoSchema,
  dadosDaInstituicaoSchema,
  decisaoSchema,
  solicitacaoSchema,
  tiposEmFaltaSchema,
} from "../validators/contaInstituicaoValidator";

// A controller só traduz HTTP. O dono dos dados vem sempre do token (req.contaInstituicaoId), nunca do caminho (RNF-002).
const dono = (req: Request) => req.contaInstituicaoId!;

export const ContaInstituicaoController = {
  async cadastrar(req: Request, res: Response) {
    res.status(201).json(await AuthInstituicaoService.cadastrar(validar(cadastroInstituicaoSchema, req.body)));
  },

  async login(req: Request, res: Response) {
    res.json(await AuthInstituicaoService.login(validar(loginSchema, req.body)));
  },

  async minha(req: Request, res: Response) {
    res.json(await ContaInstituicaoService.minha(dono(req)));
  },

  async excluir(req: Request, res: Response) {
    await ContaInstituicaoService.excluir(dono(req));
    res.status(204).end();
  },

  async solicitarInclusao(req: Request, res: Response) {
    res.status(201).json(await ContaInstituicaoService.solicitarInclusao(dono(req), validar(solicitacaoSchema, req.body)));
  },

  async simularDecisao(req: Request, res: Response) {
    res.json(await ContaInstituicaoService.simularDecisao(dono(req), validar(decisaoSchema, req.body)));
  },

  async atualizarDados(req: Request, res: Response) {
    res.json(await ContaInstituicaoService.atualizarDados(dono(req), validar(dadosDaInstituicaoSchema, req.body)));
  },

  async atualizarEstoque(req: Request, res: Response) {
    res.json(await ContaInstituicaoService.atualizarEstoque(dono(req), validar(tiposEmFaltaSchema, req.body)));
  },

  async listarCampanhas(req: Request, res: Response) {
    const campanhas = await CampanhaService.listarDaInstituicao(dono(req));
    res.json({ campanhas, total: campanhas.length });
  },

  async criarCampanha(req: Request, res: Response) {
    res.status(201).json({ campanha: await CampanhaService.criar(dono(req), validar(criarCampanhaSchema, req.body)) });
  },

  async atualizarCampanha(req: Request, res: Response) {
    const campanha = await CampanhaService.atualizar(dono(req), String(req.params.campanhaId), validar(atualizarCampanhaSchema, req.body));
    res.json({ campanha });
  },

  async encerrarCampanha(req: Request, res: Response) {
    res.json({ campanha: await CampanhaService.encerrar(dono(req), String(req.params.campanhaId)) });
  },

  async excluirCampanha(req: Request, res: Response) {
    await CampanhaService.excluir(dono(req), String(req.params.campanhaId));
    res.status(204).end();
  },
};

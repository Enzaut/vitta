import { randomUUID } from "node:crypto";
import type { ContaInstituicao, Instituicao, SolicitacaoInclusao } from "../../generated/prisma/client";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { ContaInstituicaoRepository } from "../repositories/ContaInstituicaoRepository";
import { agora } from "../utils/relogio";
import { formatarTelefone } from "../utils/telefone";
import { normalizarParaBusca } from "../utils/texto";
import { tipoParaBanco } from "../utils/tipoSanguineo";
import type { DadosDaInstituicao, DadosDecisao, DadosDoEstoque, DadosSolicitacao } from "../validators/contaInstituicaoValidator";
import { paraResposta as instituicaoParaResposta, type InstituicaoResposta } from "./InstituicaoService";

export type ContaResposta = { id: string; nome: string; email: string; cnpj: string; telefone: string | null };

export type SolicitacaoResposta = {
  situacao: "PENDENTE" | "APROVADA" | "RECUSADA";
  motivoRecusa: string | null;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string | null;
  horario: string;
  latitude: number;
  longitude: number;
  criadoEm: string;
  decididaEm: string | null;
};

// Tudo que o painel da instituição precisa para se desenhar.
export type MinhaInstituicaoResposta = {
  conta: ContaResposta;
  // O pedido de inclusão no mapa (nulo enquanto a conta não pediu).
  solicitacao: SolicitacaoResposta | null;
  // A instituição como aparece no mapa (nula até o pedido ser aprovado).
  instituicao: InstituicaoResposta | null;
  // true = a decisão do pedido é simulada (não existe administrador do VITTA): o painel mostra os botões de demonstração.
  aprovacaoSimulada: boolean;
};

export function contaParaResposta(conta: ContaInstituicao): ContaResposta {
  return { id: conta.id, nome: conta.nome, email: conta.email, cnpj: conta.cnpj, telefone: conta.telefone };
}

function solicitacaoParaResposta(s: SolicitacaoInclusao): SolicitacaoResposta {
  return {
    situacao: s.situacao,
    motivoRecusa: s.motivoRecusa,
    nome: s.nome,
    endereco: s.endereco,
    cidade: s.cidade,
    uf: s.uf,
    telefone: s.telefone,
    horario: s.horario,
    latitude: s.latitude,
    longitude: s.longitude,
    criadoEm: s.criadoEm.toISOString(),
    decididaEm: s.decididaEm?.toISOString() ?? null,
  };
}

type ContaCompleta = ContaInstituicao & { solicitacao: SolicitacaoInclusao | null; instituicao: Instituicao | null };

function resumo(conta: ContaCompleta): MinhaInstituicaoResposta {
  return {
    conta: contaParaResposta(conta),
    solicitacao: conta.solicitacao ? solicitacaoParaResposta(conta.solicitacao) : null,
    instituicao: conta.instituicao ? instituicaoParaResposta(conta.instituicao, null) : null,
    aprovacaoSimulada: env.aprovacaoSimulada,
  };
}

const MSG_SEM_CONTA = "Conta não encontrada.";
export const MSG_AINDA_NAO_APROVADA = "Sua instituição ainda não foi aprovada no mapa. Peça a inclusão e aguarde a aprovação.";

// Código estável da instituição: o nome sem acento e sem símbolos, mais um sufixo para nunca repetir.
async function gerarCodigo(nome: string): Promise<string> {
  const base = normalizarParaBusca(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "instituicao";
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = `${base}-${randomUUID().slice(0, 6)}`;
    if (!(await ContaInstituicaoRepository.codigoEmUso(codigo))) return codigo;
  }
  return `${base}-${randomUUID()}`;
}

async function carregar(contaId: string): Promise<ContaCompleta> {
  const conta = await ContaInstituicaoRepository.buscarPorId(contaId);
  if (!conta) throw new AppError(404, MSG_SEM_CONTA);
  return conta;
}

// Devolve o id da instituição da conta, ou 409 se o pedido ainda não foi aprovado.
export async function instituicaoAprovadaDaConta(contaId: string): Promise<string> {
  const conta = await carregar(contaId);
  if (!conta.instituicaoId) throw new AppError(409, MSG_AINDA_NAO_APROVADA);
  return conta.instituicaoId;
}

export const ContaInstituicaoService = {
  async minha(contaId: string): Promise<MinhaInstituicaoResposta> {
    return resumo(await carregar(contaId));
  },

  // Pedido de inclusão no mapa. Só um pedido por vez: pendente ou aprovado bloqueia um novo; recusado pode ser refeito.
  async solicitarInclusao(contaId: string, dados: DadosSolicitacao): Promise<MinhaInstituicaoResposta> {
    const conta = await carregar(contaId);
    if (conta.instituicaoId || conta.solicitacao?.situacao === "APROVADA") {
      throw new AppError(409, "Sua instituição já está no mapa.");
    }
    if (conta.solicitacao?.situacao === "PENDENTE") {
      throw new AppError(409, "Você já tem um pedido de inclusão em análise.");
    }
    await ContaInstituicaoRepository.gravarSolicitacao(contaId, dados);
    return resumo(await carregar(contaId));
  },

  // Só na demonstração: faz o papel de quem aprova ou recusa o pedido (o VITTA ainda não tem administrador).
  async simularDecisao(contaId: string, dados: DadosDecisao): Promise<MinhaInstituicaoResposta> {
    if (!env.aprovacaoSimulada) {
      throw new AppError(403, "O pedido é decidido por quem administra o VITTA.");
    }
    const conta = await carregar(contaId);
    if (!conta.solicitacao) throw new AppError(409, "Você ainda não pediu a inclusão no mapa.");
    if (conta.solicitacao.situacao !== "PENDENTE") throw new AppError(409, "Este pedido já foi decidido.");

    if (dados.decisao === "APROVADA") {
      const criada = await ContaInstituicaoRepository.aprovar(contaId, await gerarCodigo(conta.solicitacao.nome), agora());
      if (!criada) throw new AppError(409, "Este pedido já foi decidido.");
    } else {
      const recusou = await ContaInstituicaoRepository.recusar(contaId, dados.motivo?.trim() || null, agora());
      if (!recusou) throw new AppError(409, "Este pedido já foi decidido.");
    }
    return resumo(await carregar(contaId));
  },

  // Telefone e horário da instituição que está no mapa.
  async atualizarDados(contaId: string, dados: DadosDaInstituicao): Promise<MinhaInstituicaoResposta> {
    const instituicaoId = await instituicaoAprovadaDaConta(contaId);
    // No mapa o telefone aparece formatado, como nas instituições dos dados iniciais.
    const telefone = dados.telefone === undefined ? undefined : dados.telefone ? formatarTelefone(dados.telefone) : null;
    await ContaInstituicaoRepository.atualizarDadosDaInstituicao(instituicaoId, {
      ...(telefone !== undefined && { telefone }),
      ...(dados.horario !== undefined && { horario: dados.horario }),
    });
    return resumo(await carregar(contaId));
  },

  // Estoque: quais tipos sanguíneos estão em falta agora (alimenta o alerta dos cards do mapa, RN08).
  async atualizarEstoque(contaId: string, dados: DadosDoEstoque): Promise<MinhaInstituicaoResposta> {
    const instituicaoId = await instituicaoAprovadaDaConta(contaId);
    await ContaInstituicaoRepository.atualizarEstoque(instituicaoId, dados.tiposEmFalta.map(tipoParaBanco), agora());
    return resumo(await carregar(contaId));
  },

  // Apaga a conta e a instituição que ela criou (com as campanhas e os agendamentos dela).
  async excluir(contaId: string): Promise<void> {
    const conta = await carregar(contaId);
    await ContaInstituicaoRepository.excluir(contaId, conta.instituicaoId);
  },
};

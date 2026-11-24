import type { TipoSanguineo } from "../../generated/prisma/enums";
import { prisma } from "../db";
import { formatarTelefone } from "../utils/telefone";

const incluir = { solicitacao: true, instituicao: true } as const;

type DadosDaSolicitacao = {
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string | null;
  horario: string;
  latitude: number;
  longitude: number;
};

// Camada de acesso ao banco: só conversa com o Prisma, sem regra de negócio.
export const ContaInstituicaoRepository = {
  criar(dados: { nome: string; email: string; cnpj: string; telefone: string | null; senhaHash: string }) {
    return prisma.contaInstituicao.create({ data: dados, include: incluir });
  },

  buscarPorEmail(email: string) {
    return prisma.contaInstituicao.findUnique({ where: { email }, include: incluir });
  },

  buscarPorCnpj(cnpj: string) {
    return prisma.contaInstituicao.findUnique({ where: { cnpj } });
  },

  buscarPorId(id: string) {
    return prisma.contaInstituicao.findUnique({ where: { id }, include: incluir });
  },

  async existe(id: string): Promise<boolean> {
    return (await prisma.contaInstituicao.count({ where: { id } })) > 0;
  },

  // Bloqueio por tentativas de login (igual ao do doador).
  async registrarFalhaDeLogin(id: string): Promise<number> {
    const conta = await prisma.contaInstituicao.update({ where: { id }, data: { tentativasFalhas: { increment: 1 } } });
    return conta.tentativasFalhas;
  },

  bloquear(id: string, ate: Date) {
    return prisma.contaInstituicao.update({ where: { id }, data: { bloqueadoAte: ate, tentativasFalhas: 0 } });
  },

  limparFalhasDeLogin(id: string) {
    return prisma.contaInstituicao.update({ where: { id }, data: { tentativasFalhas: 0, bloqueadoAte: null } });
  },

  // Cria o pedido ou, se o anterior foi recusado, troca pelo novo (volta a PENDENTE).
  gravarSolicitacao(contaId: string, dados: DadosDaSolicitacao) {
    return prisma.solicitacaoInclusao.upsert({
      where: { contaId },
      create: { contaId, ...dados },
      update: { ...dados, situacao: "PENDENTE", motivoRecusa: null, decididaEm: null, criadoEm: new Date() },
    });
  },

  // Aprova o pedido: cria a instituição no mapa e liga a conta a ela. Devolve null se o pedido já não estava pendente
  // (dois cliques ao mesmo tempo: só um vale).
  aprovar(contaId: string, codigo: string, agora: Date) {
    return prisma.$transaction(async (tx) => {
      const pedido = await tx.solicitacaoInclusao.findUnique({ where: { contaId } });
      const virou = await tx.solicitacaoInclusao.updateMany({
        where: { contaId, situacao: "PENDENTE" },
        data: { situacao: "APROVADA", decididaEm: agora, motivoRecusa: null },
      });
      if (!pedido || virou.count === 0) return null;

      const instituicao = await tx.instituicao.create({
        data: {
          codigo,
          nome: pedido.nome,
          endereco: pedido.endereco,
          cidade: pedido.cidade,
          uf: pedido.uf,
          telefone: pedido.telefone ? formatarTelefone(pedido.telefone) : null,
          horario: pedido.horario,
          latitude: pedido.latitude,
          longitude: pedido.longitude,
          tiposEmFalta: [],
          demonstracao: false,
          fonte: "Cadastro feito pela própria instituição no VITTA",
        },
      });
      await tx.contaInstituicao.update({ where: { id: contaId }, data: { instituicaoId: instituicao.id } });
      return instituicao;
    });
  },

  async recusar(contaId: string, motivo: string | null, agora: Date): Promise<boolean> {
    const r = await prisma.solicitacaoInclusao.updateMany({
      where: { contaId, situacao: "PENDENTE" },
      data: { situacao: "RECUSADA", decididaEm: agora, motivoRecusa: motivo },
    });
    return r.count > 0;
  },

  atualizarDadosDaInstituicao(instituicaoId: string, dados: { telefone?: string | null; horario?: string }) {
    return prisma.instituicao.update({ where: { id: instituicaoId }, data: dados });
  },

  atualizarEstoque(instituicaoId: string, tipos: TipoSanguineo[], agora: Date) {
    return prisma.instituicao.update({ where: { id: instituicaoId }, data: { tiposEmFalta: tipos, estoqueAtualizadoEm: agora } });
  },

  // Exclusão definitiva da conta. A instituição criada por ela (e as campanhas e agendamentos dela) some junto.
  async excluir(contaId: string, instituicaoId: string | null) {
    await prisma.$transaction(async (tx) => {
      if (instituicaoId) await tx.instituicao.delete({ where: { id: instituicaoId } });
      await tx.contaInstituicao.delete({ where: { id: contaId } });
    });
  },

  async codigoEmUso(codigo: string): Promise<boolean> {
    return (await prisma.instituicao.count({ where: { codigo } })) > 0;
  },
};

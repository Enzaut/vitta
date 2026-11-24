import type { TipoSanguineo } from "../../generated/prisma/enums";
import { prisma } from "../db";

// Camada de acesso ao banco: só conversa com o Prisma, sem regra de negócio.
export const CampanhaRepository = {
  criar(dados: { instituicaoId: string; titulo: string; descricao: string; tiposSanguineos: TipoSanguineo[]; validaAte: Date }) {
    return prisma.campanha.create({ data: dados });
  },

  // A busca sempre junta o id da campanha E o da instituição: campanha de outra instituição não é encontrada.
  buscarDaInstituicao(id: string, instituicaoId: string) {
    return prisma.campanha.findFirst({ where: { id, instituicaoId } });
  },

  listarDaInstituicao(instituicaoId: string) {
    return prisma.campanha.findMany({ where: { instituicaoId }, orderBy: { criadaEm: "desc" } });
  },

  contarAtivas(instituicaoId: string, hoje: Date) {
    return prisma.campanha.count({ where: { instituicaoId, encerradaEm: null, validaAte: { gte: hoje } } });
  },

  atualizar(id: string, dados: { titulo?: string; descricao?: string; tiposSanguineos?: TipoSanguineo[]; validaAte?: Date }) {
    return prisma.campanha.update({ where: { id }, data: dados });
  },

  // Só encerra se ainda não estava encerrada (dois pedidos ao mesmo tempo: só um vale).
  async encerrar(id: string, agora: Date): Promise<boolean> {
    const r = await prisma.campanha.updateMany({ where: { id, encerradaEm: null }, data: { encerradaEm: agora } });
    return r.count > 0;
  },

  excluir(id: string) {
    return prisma.campanha.delete({ where: { id } });
  },

  // O que o doador vê: campanhas não encerradas e dentro da validade, com a instituição.
  listarAtivas(hoje: Date) {
    return prisma.campanha.findMany({
      where: { encerradaEm: null, validaAte: { gte: hoje } },
      include: { instituicao: true },
      orderBy: [{ validaAte: "asc" }, { criadaEm: "desc" }],
    });
  },
};

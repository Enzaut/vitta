import { prisma } from "../db";

// Camada de acesso ao banco: só conversa com o Prisma, sem regra de negócio.
export const InstituicaoRepository = {
  listarTodas() {
    return prisma.instituicao.findMany({ orderBy: { nome: "asc" } });
  },

  buscarPorId(id: string) {
    return prisma.instituicao.findUnique({ where: { id } });
  },
};

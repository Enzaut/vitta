import type { TipoSanguineo } from "../../generated/prisma/enums";
import { prisma } from "../db";

// Camada de acesso ao banco: só conversa com o Prisma, sem regra de negócio.
export const DoadorRepository = {
  criar(dados: { nome: string; email: string; dataNascimento: Date; senhaHash: string }) {
    return prisma.doador.create({ data: dados });
  },

  buscarPorEmail(email: string) {
    return prisma.doador.findUnique({ where: { email } });
  },

  buscarPorId(id: string) {
    return prisma.doador.findUnique({ where: { id } });
  },

  // HU-11: altera só o que foi informado (telefone e/ou tipo sanguíneo). Valor nulo apaga o dado.
  atualizarPerfil(id: string, dados: { telefone?: string | null; tipoSanguineo?: TipoSanguineo | null }) {
    return prisma.doador.update({ where: { id }, data: dados });
  },

  // Soma 1 falha seguida e devolve o novo total.
  async registrarFalhaDeLogin(id: string): Promise<number> {
    const doador = await prisma.doador.update({
      where: { id },
      data: { tentativasFalhas: { increment: 1 } },
    });
    return doador.tentativasFalhas;
  },

  bloquear(id: string, ate: Date) {
    return prisma.doador.update({ where: { id }, data: { bloqueadoAte: ate, tentativasFalhas: 0 } });
  },

  // Login certo: zera as falhas e remove qualquer bloqueio vencido.
  limparFalhasDeLogin(id: string) {
    return prisma.doador.update({ where: { id }, data: { tentativasFalhas: 0, bloqueadoAte: null } });
  },

  // Exclusão definitiva (HU-02). Quando existirem outras tabelas ligadas ao doador,
  // elas devem ser apagadas junto (onDelete: Cascade no schema).
  excluir(id: string) {
    return prisma.doador.delete({ where: { id } });
  },
};

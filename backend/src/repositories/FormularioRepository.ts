import type { Prisma } from "../../generated/prisma/client";
import type { ResultadoElegibilidade } from "../../generated/prisma/enums";
import { prisma } from "../db";

export type DadosFormulario = {
  preenchidoEm: Date;
  validoAte: Date;
  resultado: ResultadoElegibilidade;
  liberadoEm: Date | null;
  mensagem: string;
  motivos: Prisma.InputJsonValue;
  avisos: Prisma.InputJsonValue;
  versaoRegras: string;
  respostas: Prisma.InputJsonValue;
};

// Camada de acesso ao banco: só conversa com o Prisma, sem regra de negócio.
export const FormularioRepository = {
  buscarPorDoador(doadorId: string) {
    return prisma.formularioElegibilidade.findUnique({ where: { doadorId } });
  },

  // Cada doador tem um só formulário: responder de novo substitui o anterior.
  salvar(doadorId: string, dados: DadosFormulario) {
    return prisma.formularioElegibilidade.upsert({
      where: { doadorId },
      create: { doadorId, ...dados },
      update: dados,
    });
  },
};

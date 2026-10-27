import { prisma } from "../db";

export const SaudeRepository = {
  // Pergunta qualquer coisa simples ao banco só para saber se ele responde.
  async pingar(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  },
};

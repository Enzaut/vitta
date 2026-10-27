import { SaudeRepository } from "../repositories/SaudeRepository";

export const SaudeService = {
  // Rota de teste do ambiente (Entrega 0): a API está de pé e o banco responde?
  async verificar(): Promise<{ status: "ok" | "erro"; banco: "ok" | "indisponivel" }> {
    try {
      await SaudeRepository.pingar();
      return { status: "ok", banco: "ok" };
    } catch {
      return { status: "erro", banco: "indisponivel" };
    }
  },
};

import { calcularProgresso } from "../gamificacao/regras";
import { AgendamentoRepository } from "../repositories/AgendamentoRepository";

// O que a API devolve sobre os pontos e a patente do doador.
export type ResumoDeGamificacao = {
  // Saldo de pontos (RN-007). Quando houver troca por vouchers (HU-08), os pontos gastos saem daqui.
  pontos: number;
  // Quantas doações a instituição já confirmou.
  doacoes: number;
  patente: { nivel: number; nome: string };
  // Nulo quando a pessoa já está na maior patente.
  proximaPatente: { nivel: number; nome: string; doacoesNecessarias: number; faltam: number } | null;
};

export function resumoParaDoacoes(doacoes: number, pontos: number): ResumoDeGamificacao {
  const { patente, proxima } = calcularProgresso(doacoes);
  return {
    pontos,
    doacoes,
    patente: { nivel: patente.nivel, nome: patente.nome },
    proximaPatente: proxima && {
      nivel: proxima.nivel,
      nome: proxima.nome,
      doacoesNecessarias: proxima.doacoesNecessarias,
      faltam: proxima.faltam,
    },
  };
}

export const GamificacaoService = {
  // Pontos e patente de hoje, contados das doações confirmadas (status Finalizado).
  async resumo(doadorId: string): Promise<ResumoDeGamificacao> {
    const { doacoes, pontos } = await AgendamentoRepository.totaisDeDoacoes(doadorId);
    return resumoParaDoacoes(doacoes, pontos);
  },
};

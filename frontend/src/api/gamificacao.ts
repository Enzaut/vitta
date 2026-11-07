import { requisicao } from "./client";

// RN-007 e RN-008: pontos e patente do doador. Os números (pontos por doação, doações de cada patente) vêm da API.

export type ResumoDeGamificacao = {
  // Saldo de pontos.
  pontos: number;
  // Doações que a instituição já confirmou.
  doacoes: number;
  patente: { nivel: number; nome: string };
  // Nulo quando a pessoa já está na maior patente.
  proximaPatente: { nivel: number; nome: string; doacoesNecessarias: number; faltam: number } | null;
};

export const apiGamificacao = {
  resumo: (token: string) => requisicao<{ gamificacao: ResumoDeGamificacao }>("/doadores/me/gamificacao", { token }),
};

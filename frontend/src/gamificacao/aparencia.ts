import type { ResumoDeGamificacao } from "../api/gamificacao";

// Cor de cada patente (RN-008). O nível 0 é quem ainda não doou.
const CORES: Record<number, { cor: string; fundo: string }> = {
  0: { cor: "#6A6A6A", fundo: "#EDEDED" }, // Iniciante
  1: { cor: "#9A4F22", fundo: "#F6E7DC" }, // Bronze
  2: { cor: "#566271", fundo: "#E8ECF0" }, // Prata
  3: { cor: "#8A6A00", fundo: "#FFF3CC" }, // Ouro
  4: { cor: "#16698F", fundo: "#E0F2FA" }, // Diamante
};

export const aparenciaDaPatente = (nivel: number) => CORES[nivel] ?? CORES[0];

// 0 -> "nenhuma doação", 1 -> "1 doação", 3 -> "3 doações"
export const doacoesPorExtenso = (n: number) => (n === 0 ? "nenhuma doação" : n === 1 ? "1 doação" : `${n} doações`);

// "Faltam 2 doações para a patente Prata." ou, na maior patente, "Você chegou à maior patente!"
export function textoDoProgresso(resumo: ResumoDeGamificacao): string {
  if (!resumo.proximaPatente) return "Você chegou à maior patente!";
  const { faltam, nome } = resumo.proximaPatente;
  return `${faltam === 1 ? "Falta" : "Faltam"} ${doacoesPorExtenso(faltam)} para a patente ${nome}.`;
}

// Quanto da barra de progresso fica cheia (de 0 a 1): doações confirmadas em relação ao que a próxima patente pede.
export function fracaoDoProgresso(resumo: ResumoDeGamificacao): number {
  if (!resumo.proximaPatente) return 1;
  return Math.min(resumo.doacoes / resumo.proximaPatente.doacoesNecessarias, 1);
}

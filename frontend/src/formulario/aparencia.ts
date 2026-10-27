import type { Ionicons } from "@expo/vector-icons";
import type { Resultado } from "../api/formulario";
import { cores } from "../theme";

// Cada resultado do formulário tem cor, ícone e título próprios (HU-03: apto, inapto temporário e inapto têm mensagens diferentes).
export const APARENCIA: Record<Resultado, { titulo: string; icone: keyof typeof Ionicons.glyphMap; cor: string; fundo: string }> = {
  APTO: { titulo: "Você pode agendar", icone: "checkmark-circle", cor: cores.sucesso, fundo: cores.fundoSucesso },
  AVALIACAO: { titulo: "Você pode agendar, com avaliação", icone: "information-circle", cor: "#9A7400", fundo: "#FFF6DD" },
  INAPTO_TEMPORARIO: { titulo: "Não é possível doar agora", icone: "time", cor: cores.primaria, fundo: cores.fundoErro },
  INAPTO: { titulo: "Doação não indicada", icone: "close-circle", cor: cores.primariaEscura, fundo: cores.fundoErro },
};

// "2026-10-19T15:00:00.000Z" -> "19/10/2026 às 12:00" (horário do aparelho)
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} às ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

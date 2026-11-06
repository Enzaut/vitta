import type { Ionicons } from "@expo/vector-icons";
import type { Formulario, Resultado } from "../api/formulario";
import { cores } from "../theme";

type Aparencia = { titulo: string; icone: keyof typeof Ionicons.glyphMap; cor: string; fundo: string };

// A resposta do formulário é positiva (passou) ou negativa (não passou). Cada resultado tem cor, ícone e título próprios
// (HU-03: apto, apto com avaliação, inapto temporário e inapto têm mensagens diferentes).
export const APARENCIA: Record<Resultado, Aparencia> = {
  APTO: { titulo: "Você passou: pode agendar", icone: "checkmark-circle", cor: cores.sucesso, fundo: cores.fundoSucesso },
  AVALIACAO: { titulo: "Você passou: pode agendar, com avaliação", icone: "information-circle", cor: "#9A7400", fundo: "#FFF6DD" },
  INAPTO_TEMPORARIO: { titulo: "Você não passou: ainda não é possível doar", icone: "time", cor: cores.primaria, fundo: cores.fundoErro },
  INAPTO: { titulo: "Você não passou: doação não indicada", icone: "close-circle", cor: cores.primariaEscura, fundo: cores.fundoErro },
};

// RN-003: passados os 7 dias, o formulário deixa de valer (tenha a pessoa passado ou não) e é preciso responder de novo.
const APARENCIA_VENCIDO: Aparencia = { titulo: "Formulário vencido", icone: "alert-circle", cor: "#9A7400", fundo: "#FFF6DD" };

export const aparenciaDo = (formulario: Pick<Formulario, "resultado" | "vencido">): Aparencia =>
  formulario.vencido ? APARENCIA_VENCIDO : APARENCIA[formulario.resultado];

// RN-005: quem não passou ainda está nos 3 dias de espera? Quem decide é a API (que recusa com erro 429);
// o app só evita oferecer o que ela vai recusar. O horário vem da API, então vale para qualquer aparelho.
export function aindaEmEspera(formulario: Pick<Formulario, "podeResponderAgora" | "podeResponderEm">, agora = Date.now()): boolean {
  if (formulario.podeResponderAgora || !formulario.podeResponderEm) return false;
  return new Date(formulario.podeResponderEm).getTime() > agora;
}

// "2026-10-19T15:00:00.000Z" -> "19/10/2026 às 12:00" (horário do aparelho)
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} às ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

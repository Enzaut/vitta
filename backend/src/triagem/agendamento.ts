// RN-003, RN-004 e RN-005: o que o resultado do formulário permite agora.
//  - Passou (APTO ou AVALIACAO): vale por 7 dias e libera o agendamento enquanto valer (RN-003).
//  - Não passou (INAPTO ou INAPTO_TEMPORARIO): o agendamento fica bloqueado e a pessoa só pode
//    responder de novo depois de 3 dias (RN-005). Para agendar, ela precisa passar de novo.
//  - Passou da validade, ou nunca respondeu: é preciso responder ao formulário e passar (RN-004).
// Funções puras (recebem o momento), para a API, a futura HU-04 (agendar doação) e os testes usarem a mesma regra.
import type { Resultado } from "./analisar";
import { formatarBr, formatarDataHoraBr, hojeNoBrasil, type DataISO } from "./datas";
import { ESPERA_APOS_REPROVACAO_DIAS } from "./modelo";

// Mensagem da HU-03, cenário 3.
export const MSG_FORMULARIO_VENCIDO =
  "Suas informações de elegibilidade precisam ser atualizadas. Responda ao formulário para continuar agendando doações.";
export const MSG_SEM_FORMULARIO = "Responda ao formulário de elegibilidade para poder agendar a sua doação.";

const MS_POR_DIA = 86_400_000;

// A resposta do formulário: positiva (passou) ou negativa (não passou).
export const passou = (resultado: Resultado): boolean => resultado === "APTO" || resultado === "AVALIACAO";

// Primeiro momento em que quem não passou pode responder de novo. Nulo para quem passou: pode responder quando quiser.
export function podeResponderEm(formulario: { resultado: Resultado; preenchidoEm: Date }): Date | null {
  if (passou(formulario.resultado)) return null;
  return new Date(formulario.preenchidoEm.getTime() + ESPERA_APOS_REPROVACAO_DIAS * MS_POR_DIA);
}

export type CodigoDaSituacao = "LIBERADO" | "SEM_FORMULARIO" | "VENCIDO" | "NAO_APROVADO";

export type SituacaoDoFormulario = {
  resultado: Resultado;
  preenchidoEm: Date;
  validoAte: DataISO;
  // Só para quem não passou de forma temporária: o dia a partir do qual a doação volta a ser possível.
  liberadoEm?: DataISO | null;
};

export type SituacaoDoAgendamento = {
  codigo: CodigoDaSituacao;
  // Passou no formulário (mesmo que a validade já tenha acabado).
  aprovado: boolean;
  // O formulário passou da validade: é preciso responder de novo.
  vencido: boolean;
  agendamentoLiberado: boolean;
  // Por que o agendamento está bloqueado (nulo quando está liberado).
  bloqueio: string | null;
  // Quando quem não passou pode responder de novo (nulo para quem passou ou nunca respondeu).
  podeResponderEm: Date | null;
  podeResponderAgora: boolean;
};

function mensagemDeQuemNaoPassou(formulario: SituacaoDoFormulario, espera: Date, podeAgora: boolean): string {
  const base =
    formulario.resultado === "INAPTO"
      ? "Pelas suas respostas, a doação de sangue não é indicada para você. Se tiver dúvidas, converse com a equipe de um hemocentro."
      : formulario.liberadoEm
        ? `No momento você não está apto(a) para realizar doações. Você poderá doar a partir de ${formatarBr(formulario.liberadoEm)}.`
        : "No momento você não está apto(a) para realizar doações.";
  const depois = podeAgora
    ? "Você já pode responder ao formulário de novo."
    : `Você poderá responder ao formulário de novo em ${formatarDataHoraBr(espera)}.`;
  return `${base} ${depois}`;
}

// formulario nulo = a pessoa ainda não respondeu.
export function situacaoDoAgendamento(formulario: SituacaoDoFormulario | null, agora: Date): SituacaoDoAgendamento {
  if (!formulario) {
    return {
      codigo: "SEM_FORMULARIO",
      aprovado: false,
      vencido: false,
      agendamentoLiberado: false,
      bloqueio: MSG_SEM_FORMULARIO,
      podeResponderEm: null,
      podeResponderAgora: true,
    };
  }

  const aprovado = passou(formulario.resultado);
  const espera = podeResponderEm(formulario);
  const podeResponderAgora = espera === null || espera.getTime() <= agora.getTime();
  // "validoAte" é o último dia de validade.
  const vencido = formulario.validoAte < hojeNoBrasil(agora);
  const comum = { aprovado, podeResponderEm: espera, podeResponderAgora };

  if (vencido) return { ...comum, codigo: "VENCIDO", vencido: true, agendamentoLiberado: false, bloqueio: MSG_FORMULARIO_VENCIDO };
  if (!aprovado) {
    return {
      ...comum,
      codigo: "NAO_APROVADO",
      vencido: false,
      agendamentoLiberado: false,
      bloqueio: mensagemDeQuemNaoPassou(formulario, espera!, podeResponderAgora),
    };
  }
  return { ...comum, codigo: "LIBERADO", vencido: false, agendamentoLiberado: true, bloqueio: null };
}

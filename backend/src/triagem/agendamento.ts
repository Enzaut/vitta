// RN-003 e RN-004: o doador pode agendar hoje? Depende do resultado do formulário e da validade dele.
// Função pura (recebe a data de hoje), para a futura HU-04 (agendar doação) e os testes usarem a mesma regra.
import { formatarBr, type DataISO } from "./datas";
import type { Resultado } from "./analisar";

// Mensagem da HU-03, cenário 3.
export const MSG_FORMULARIO_VENCIDO =
  "Suas informações de elegibilidade precisam ser atualizadas. Responda ao formulário para continuar agendando doações.";

export type SituacaoDoFormulario = { resultado: Resultado; liberadoEm: DataISO | null; validoAte: DataISO };

export type SituacaoDoAgendamento = {
  // O formulário passou da validade: é preciso responder de novo.
  vencido: boolean;
  agendamentoLiberado: boolean;
  // Por que o agendamento está bloqueado (nulo quando está liberado).
  bloqueio: string | null;
};

export function situacaoDoAgendamento(formulario: SituacaoDoFormulario, hoje: DataISO): SituacaoDoAgendamento {
  // "validoAte" é o último dia de validade.
  if (formulario.validoAte < hoje) return { vencido: true, agendamentoLiberado: false, bloqueio: MSG_FORMULARIO_VENCIDO };

  switch (formulario.resultado) {
    case "APTO":
    case "AVALIACAO":
      return { vencido: false, agendamentoLiberado: true, bloqueio: null };

    case "INAPTO":
      return {
        vencido: false,
        agendamentoLiberado: false,
        bloqueio: "Pelas suas respostas, a doação de sangue não é indicada para você. Se tiver dúvidas, converse com a equipe de um hemocentro.",
      };

    case "INAPTO_TEMPORARIO":
      if (formulario.liberadoEm && formulario.liberadoEm <= hoje) return { vencido: false, agendamentoLiberado: true, bloqueio: null };
      return {
        vencido: false,
        agendamentoLiberado: false,
        bloqueio: formulario.liberadoEm
          ? `No momento você não está apto(a) para realizar doações. O agendamento estará disponível a partir de ${formatarBr(formulario.liberadoEm)}.`
          : "No momento você não está apto(a) para realizar doações. Responda ao formulário de novo quando a situação mudar.",
      };
  }
}

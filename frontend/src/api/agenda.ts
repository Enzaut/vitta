import { requisicao } from "./client";

// HU-04: a agenda das instituições (médicos e horários livres e ocupados) e os agendamentos de doação.
// Por enquanto os médicos e os horários são inventados pela API (simulado: true), enquanto não há integração com as instituições.

export type StatusDoHorario = "LIVRE" | "OCUPADO";

export type HorarioDaAgenda = {
  // Começo do horário (ISO, UTC). É o valor que volta para a API ao agendar.
  inicio: string;
  // A hora em Brasília, pronta para mostrar ("08:30").
  hora: string;
  status: StatusDoHorario;
};

export type MedicoDaAgenda = {
  codigo: string;
  nome: string;
  especialidade: string;
  duracaoMin: number;
  horarios: HorarioDaAgenda[];
};

export type DiaDaAgenda = {
  // AAAA-MM-DD
  data: string;
  livres: number;
  ocupados: number;
  // Só os médicos que atendem nesse dia.
  medicos: MedicoDaAgenda[];
};

export type Agenda = {
  instituicao: { id: string; nome: string; demonstracao: boolean };
  // true = médicos e horários inventados.
  simulado: boolean;
  dias: DiaDaAgenda[];
};

export type StatusAgendamento = "AGENDADO" | "FINALIZADO" | "CANCELADO";

export type Agendamento = {
  id: string;
  status: StatusAgendamento;
  inicio: string;
  fim: string;
  // O mesmo horário em Brasília, pronto para mostrar: dia (AAAA-MM-DD) e horas ("08:30").
  data: string;
  hora: string;
  horaFim: string;
  instituicao: { id: string; nome: string; endereco: string; cidade: string; uf: string; demonstracao: boolean };
  medico: { codigo: string; nome: string; especialidade: string };
  tipoSanguineo: string;
  // Código que a instituição devolveu ao receber o pedido.
  protocolo: string;
  criadoEm: string;
  canceladoEm: string | null;
};

export type PedidoDeAgendamento = {
  instituicaoId: string;
  medicoCodigo: string;
  inicio: string;
  tipoSanguineo: string;
};

export type RespostaDoAgendamento = { agendamento: Agendamento; mensagem: string };

export const apiAgenda = {
  agenda: (token: string, instituicaoId: string) => requisicao<Agenda>(`/instituicoes/${encodeURIComponent(instituicaoId)}/agenda`, { token }),

  // O agendamento que ainda vai acontecer (no máximo um), ou nulo.
  proximo: (token: string) => requisicao<{ agendamento: Agendamento | null }>("/doadores/me/agendamentos/proximo", { token }),

  // A API confere o formulário de novo antes de reservar (RN-004) e recusa com 403 quem não pode agendar.
  agendar: (token: string, pedido: PedidoDeAgendamento) =>
    requisicao<RespostaDoAgendamento>("/doadores/me/agendamentos", { metodo: "POST", corpo: pedido, token }),

  cancelar: (token: string, id: string) =>
    requisicao<RespostaDoAgendamento>(`/doadores/me/agendamentos/${encodeURIComponent(id)}`, { metodo: "DELETE", token }),
};

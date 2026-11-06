import type { DataISO } from "../triagem/datas";
import type { TipoSanguineoTexto } from "../utils/tipoSanguineo";

// RN-005: quem guarda a agenda é a instituição. O VITTA pergunta a ela quais médicos e horários existem e
// manda o pedido de reserva (e de cancelamento). Este arquivo descreve essa conversa; hoje quem responde
// é uma simulação (agendaSimulada.ts) e, no futuro, pode ser a API de cada instituição.

export type StatusDoHorario = "LIVRE" | "OCUPADO";

export type HorarioDaAgenda = {
  // O começo do horário em ISO (UTC). É o valor que o app devolve ao agendar.
  inicio: string;
  // A hora em Brasília ("08:30"), pronta para mostrar.
  hora: string;
  status: StatusDoHorario;
};

export type MedicoDaAgenda = {
  // Identificador do médico no sistema da instituição.
  codigo: string;
  nome: string;
  especialidade: string;
  duracaoMin: number;
  horarios: HorarioDaAgenda[];
};

export type DiaDaAgenda = {
  data: DataISO;
  livres: number;
  ocupados: number;
  // Só os médicos que atendem nesse dia.
  medicos: MedicoDaAgenda[];
};

export type InstituicaoDaAgenda = { id: string; codigo: string; nome: string };

export type PedidoDeReserva = {
  instituicao: InstituicaoDaAgenda;
  medicoCodigo: string;
  inicio: Date;
  doador: { id: string; nome: string };
  tipoSanguineo: TipoSanguineoTexto;
};

export type ConfirmacaoDaReserva = {
  // Código que a instituição devolve para identificar a reserva.
  protocolo: string;
  medico: { codigo: string; nome: string; especialidade: string };
  duracaoMin: number;
};

export interface AgendaDaInstituicao {
  // true = os médicos e os horários são inventados (ainda não há integração com a instituição).
  readonly simulado: boolean;
  // Médicos e horários (livres e ocupados) dos próximos dias.
  consultar(instituicao: InstituicaoDaAgenda, agora: Date): Promise<DiaDaAgenda[]>;
  // Envia o pedido de reserva. Pode recusar com um dos erros abaixo.
  reservar(pedido: PedidoDeReserva, agora: Date): Promise<ConfirmacaoDaReserva>;
  // Avisa a instituição que a reserva foi cancelada.
  cancelar(protocolo: string): Promise<void>;
}

// Esse horário não existe na agenda do médico (ou já passou, ou está longe demais).
export class HorarioInexistenteError extends Error {}
// O horário existe, mas outra pessoa já ficou com ele.
export class HorarioOcupadoError extends Error {}
// A instituição não respondeu ou devolveu erro (HU-04, cenário 4).
export class InstituicaoIndisponivelError extends Error {}

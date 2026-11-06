import { randomUUID } from "node:crypto";
import { AgendamentoRepository } from "../repositories/AgendamentoRepository";
import { JANELA_DE_DIAS, chaveDoHorario, gerarAgenda } from "./grade";
import { medicosDaInstituicao } from "./medicosSimulados";
import {
  HorarioInexistenteError,
  HorarioOcupadoError,
  type AgendaDaInstituicao,
  type ConfirmacaoDaReserva,
  type DiaDaAgenda,
  type InstituicaoDaAgenda,
  type PedidoDeReserva,
} from "./tipos";

// A "instituição de mentira" (RN-005): inventa os médicos e os horários e responde aos pedidos como uma instituição de verdade.
// Para saber o que o VITTA já reservou (e mostrar como ocupado para os outros), ela olha a tabela de agendamentos;
// numa integração real essa informação viria da própria instituição.
const UM_DIA_MS = 86_400_000;

export const agendaSimulada: AgendaDaInstituicao = {
  simulado: true,

  async consultar(instituicao: InstituicaoDaAgenda, agora: Date): Promise<DiaDaAgenda[]> {
    const ate = new Date(agora.getTime() + (JANELA_DE_DIAS + 1) * UM_DIA_MS);
    const reservas = await AgendamentoRepository.horariosReservados(instituicao.id, agora, ate);
    return gerarAgenda({
      instituicaoCodigo: instituicao.codigo,
      medicos: medicosDaInstituicao(instituicao.codigo),
      agora,
      reservados: new Set(reservas.map((r) => chaveDoHorario(r.medicoCodigo, r.inicio))),
    });
  },

  async reservar(pedido: PedidoDeReserva, agora: Date): Promise<ConfirmacaoDaReserva> {
    const dias = await agendaSimulada.consultar(pedido.instituicao, agora);
    const iso = pedido.inicio.toISOString();

    for (const dia of dias) {
      for (const medico of dia.medicos) {
        if (medico.codigo !== pedido.medicoCodigo) continue;
        const horario = medico.horarios.find((h) => h.inicio === iso);
        if (!horario) continue;
        if (horario.status === "OCUPADO") throw new HorarioOcupadoError();
        return {
          protocolo: `SIM-${randomUUID().slice(0, 8).toUpperCase()}`,
          medico: { codigo: medico.codigo, nome: medico.nome, especialidade: medico.especialidade },
          duracaoMin: medico.duracaoMin,
        };
      }
    }
    // Não está na agenda: o médico não atende nesse dia e hora, ou o horário já passou ou está longe demais.
    throw new HorarioInexistenteError();
  },

  async cancelar(): Promise<void> {
    // Na simulação não há ninguém para avisar: o horário volta a ficar livre quando o agendamento é cancelado no VITTA.
  },
};

let agendaEmUso: AgendaDaInstituicao = agendaSimulada;

// Quem responde pela agenda das instituições.
export const agenda = (): AgendaDaInstituicao => agendaEmUso;

// Para os testes trocarem a instituição por uma que falha (HU-04, cenário 4). Sem argumento, volta à simulação.
export function definirAgenda(outra: AgendaDaInstituicao | null): void {
  agendaEmUso = outra ?? agendaSimulada;
}

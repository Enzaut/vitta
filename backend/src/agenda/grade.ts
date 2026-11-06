import { hojeNoBrasil, somarDias, type DataISO } from "../triagem/datas";
import { diaDaSemana, horaDeMinutos, horaEmBrasilia, instanteEmBrasilia, minutosDoDia, misturar } from "./horario";
import type { MedicoSimulado } from "./medicosSimulados";
import type { DiaDaAgenda, MedicoDaAgenda } from "./tipos";

// A grade de horários que a "instituição de mentira" mostra. Conta pura: recebe o momento e devolve a agenda.

// Quantos dias para a frente a pessoa consegue agendar (hoje e mais 13).
export const JANELA_DE_DIAS = 14;
// Só aparecem horários que começam daqui a pelo menos 2 horas (dá tempo de se organizar e da instituição se preparar).
export const ANTECEDENCIA_MINIMA_MIN = 120;

// Chave de um horário de um médico, para comparar com o que já foi reservado: "codigo-do-medico|2026-11-09T11:30:00.000Z".
export const chaveDoHorario = (medicoCodigo: string, inicio: Date | string): string =>
  `${medicoCodigo}|${typeof inicio === "string" ? inicio : inicio.toISOString()}`;

// Quanto da agenda "já está tomado" por outras pessoas (de mentira). O resultado só depende do horário,
// então aparece igual para todo mundo e toda vez que se olha. Em média, metade dos horários está ocupada:
//  - 1 dia em cada 9 a instituição inteira está lotada;
//  - 1 dia em cada 5 o médico está com a agenda quase cheia (85% ocupada);
//  - nos outros, 35% ocupada.
export function ocupadoNaSimulacao(instituicaoCodigo: string, medicoCodigo: string, data: DataISO, inicio: string): boolean {
  if (misturar(`${instituicaoCodigo}|dia|${data}`) % 9 === 0) return true;
  const medicoCheio = misturar(`${medicoCodigo}|dia|${data}`) % 5 === 0;
  return misturar(`${medicoCodigo}|${inicio}`) % 100 < (medicoCheio ? 85 : 35);
}

export type EntradaDaGrade = {
  instituicaoCodigo: string;
  medicos: MedicoSimulado[];
  agora: Date;
  // Horários que o VITTA já reservou (chaveDoHorario), que ficam ocupados para os outros doadores.
  reservados: ReadonlySet<string>;
};

// Horários de um médico em um dia: de cada turno, um a cada "duracaoMin", enquanto o atendimento cabe no turno.
function horariosDoDia(medico: MedicoSimulado, data: DataISO, entrada: EntradaDaGrade, primeiroInstante: number): MedicoDaAgenda["horarios"] {
  const horarios: MedicoDaAgenda["horarios"] = [];
  for (const turno of medico.turnos) {
    const fim = minutosDoDia(turno.fim);
    for (let comeco = minutosDoDia(turno.inicio); comeco + medico.duracaoMin <= fim; comeco += medico.duracaoMin) {
      const inicio = instanteEmBrasilia(data, horaDeMinutos(comeco));
      if (inicio.getTime() < primeiroInstante) continue;
      const iso = inicio.toISOString();
      const ocupado =
        entrada.reservados.has(chaveDoHorario(medico.codigo, iso)) || ocupadoNaSimulacao(entrada.instituicaoCodigo, medico.codigo, data, iso);
      horarios.push({ inicio: iso, hora: horaEmBrasilia(inicio), status: ocupado ? "OCUPADO" : "LIVRE" });
    }
  }
  return horarios;
}

export function gerarAgenda(entrada: EntradaDaGrade): DiaDaAgenda[] {
  const hoje = hojeNoBrasil(entrada.agora);
  const primeiroInstante = entrada.agora.getTime() + ANTECEDENCIA_MINIMA_MIN * 60_000;
  const dias: DiaDaAgenda[] = [];

  for (let i = 0; i < JANELA_DE_DIAS; i++) {
    const data = somarDias(hoje, i);
    const semana = diaDaSemana(data);
    const medicos: MedicoDaAgenda[] = [];

    for (const medico of entrada.medicos) {
      if (!medico.dias.includes(semana)) continue;
      const horarios = horariosDoDia(medico, data, entrada, primeiroInstante);
      if (horarios.length === 0) continue;
      medicos.push({ codigo: medico.codigo, nome: medico.nome, especialidade: medico.especialidade, duracaoMin: medico.duracaoMin, horarios });
    }

    if (medicos.length === 0) continue;
    const todos = medicos.flatMap((m) => m.horarios);
    const livres = todos.filter((h) => h.status === "LIVRE").length;
    dias.push({ data, livres, ocupados: todos.length - livres, medicos });
  }

  return dias;
}

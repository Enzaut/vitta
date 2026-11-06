import type { DataISO } from "../triagem/datas";

// Os horários da agenda valem em Brasília, que fica 3 horas atrás do UTC o ano todo
// (o Brasil não usa horário de verão desde 2019).
const DESLOCAMENTO_DE_BRASILIA_H = 3;

// "2026-11-09" + "08:30" -> o instante em UTC (11:30 UTC).
export function instanteEmBrasilia(data: DataISO, hora: string): Date {
  return new Date(`${data}T${hora}:00-0${DESLOCAMENTO_DE_BRASILIA_H}:00`);
}

// O contrário: que horas ("08:30") um instante marca em Brasília.
export function horaEmBrasilia(momento: Date): string {
  return new Date(momento.getTime() - DESLOCAMENTO_DE_BRASILIA_H * 3_600_000).toISOString().slice(11, 16);
}

// Dia da semana de uma data: 1 = segunda ... 7 = domingo.
export function diaDaSemana(data: DataISO): number {
  const dia = new Date(`${data}T00:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

// "08:30" -> minutos desde a meia-noite (510).
export function minutosDoDia(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

// 510 -> "08:30"
export function horaDeMinutos(minutos: number): string {
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(Math.floor(minutos / 60))}:${dois(minutos % 60)}`;
}

// Número "aleatório" que sempre sai igual para o mesmo texto (fmix32 do MurmurHash). Serve para a simulação:
// o mesmo horário aparece ocupado (ou livre) toda vez que a pessoa olha, em qualquer aparelho.
export function misturar(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

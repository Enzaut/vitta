// Datas "só dia" da triagem: texto AAAA-MM-DD, sem horário nem fuso.
// As contas usam UTC para o horário de verão e o fuso do servidor não mudarem o resultado.
export type DataISO = string;

// Prazo da Portaria. Horas viram dias inteiros, arredondando para cima (48 horas = 2 dias; 12 horas = 1 dia).
export type Prazo = { dias?: number; meses?: number; anos?: number };

const PADRAO = /^(\d{4})-(\d{2})-(\d{2})$/;

// Devolve a data (meia-noite UTC) se o texto for AAAA-MM-DD e a data existir no calendário.
export function lerData(texto: unknown): Date | null {
  if (typeof texto !== "string") return null;
  const m = PADRAO.exec(texto);
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const existe = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  return existe ? data : null;
}

export function dataValida(texto: unknown): texto is DataISO {
  return lerData(texto) !== null;
}

export function paraTexto(data: Date): DataISO {
  return data.toISOString().slice(0, 10);
}

function exigir(data: DataISO): Date {
  const lida = lerData(data);
  if (!lida) throw new Error(`Data inválida: ${data}`);
  return lida;
}

export function somarDias(data: DataISO, dias: number): DataISO {
  const d = exigir(data);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraTexto(d);
}

// "4 meses depois" = o mesmo dia do mês, 4 meses à frente.
// Se esse dia não existir no mês de destino (31/10 + 4 meses), vale o último dia do mês.
export function somarMeses(data: DataISO, meses: number): DataISO {
  const d = exigir(data);
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + meses;
  const ano = Math.floor(total / 12);
  const mes = total % 12;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return paraTexto(new Date(Date.UTC(ano, mes, Math.min(d.getUTCDate(), ultimoDia))));
}

export function somarPrazo(data: DataISO, prazo: Prazo): DataISO {
  let resultado = data;
  if (prazo.anos) resultado = somarMeses(resultado, prazo.anos * 12);
  if (prazo.meses) resultado = somarMeses(resultado, prazo.meses);
  if (prazo.dias) resultado = somarDias(resultado, prazo.dias);
  return resultado;
}

// Anos completos na data "hoje".
export function idadeEm(nascimento: DataISO, hoje: DataISO): number {
  const n = exigir(nascimento);
  const h = exigir(hoje);
  const fezAniversario =
    h.getUTCMonth() > n.getUTCMonth() || (h.getUTCMonth() === n.getUTCMonth() && h.getUTCDate() >= n.getUTCDate());
  return h.getUTCFullYear() - n.getUTCFullYear() - (fezAniversario ? 0 : 1);
}

// AAAA-MM-DD -> DD/MM/AAAA
export function formatarBr(data: DataISO): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

// A data de hoje no Brasil (horário de Brasília), mesmo que o servidor esteja em outro fuso.
export function hojeNoBrasil(agora: Date = new Date()): DataISO {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

// Texto do prazo para as mensagens: "14 dias", "1 mês", "4 meses", "3 anos".
export function descreverPrazo(prazo: Prazo): string {
  const partes: string[] = [];
  if (prazo.anos) partes.push(`${prazo.anos} ${prazo.anos === 1 ? "ano" : "anos"}`);
  if (prazo.meses) partes.push(`${prazo.meses} ${prazo.meses === 1 ? "mês" : "meses"}`);
  if (prazo.dias) partes.push(`${prazo.dias} ${prazo.dias === 1 ? "dia" : "dias"}`);
  return partes.join(" e ");
}

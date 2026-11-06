// Datas da agenda por extenso, sem depender de Intl (que muda de aparelho para aparelho).
// A API manda os dias como AAAA-MM-DD e as horas já em Brasília; aqui só se escreve.

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function partes(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  const diaDaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  return { dia, mes: mes - 1, diaDaSemana };
}

// "2026-10-19" -> "seg"
export const diaDaSemanaCurto = (data: string) => DIAS_CURTOS[partes(data).diaDaSemana];

// "2026-10-19" -> "19"
export const numeroDoDia = (data: string) => String(partes(data).dia);

// "2026-10-19" -> "out"
export const mesCurto = (data: string) => MESES_CURTOS[partes(data).mes];

// "2026-10-19" -> "Segunda-feira, 19 de outubro"
export function dataPorExtenso(data: string): string {
  const { dia, mes, diaDaSemana } = partes(data);
  const texto = `${DIAS[diaDaSemana]}, ${dia} de ${MESES[mes]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// 1 -> "1 livre", 3 -> "3 livres"
export const rotuloDeLivres = (livres: number) => (livres === 1 ? "1 livre" : `${livres} livres`);

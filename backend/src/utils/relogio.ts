// Relógio do sistema. Existe para os testes poderem "andar no tempo" (ex.: ver o agendamento liberar
// depois da data de retorno) sem mexer na hora do computador.
let relogio: () => Date = () => new Date();

export const agora = (): Date => relogio();

export function definirRelogio(funcao: (() => Date) | null): void {
  relogio = funcao ?? (() => new Date());
}

// Dia de hoje em Brasília, no formato AAAA-MM-DD (campanhas e prazos valem por dia de Brasília).
export function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(agora());
}

// Relógio do sistema. Existe para os testes poderem "andar no tempo" (ex.: ver o agendamento liberar
// depois da data de retorno) sem mexer na hora do computador.
let relogio: () => Date = () => new Date();

export const agora = (): Date => relogio();

export function definirRelogio(funcao: (() => Date) | null): void {
  relogio = funcao ?? (() => new Date());
}

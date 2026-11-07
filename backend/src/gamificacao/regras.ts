// RN-007 (pontos) e RN-008 (patentes). O Documento de Requisitos diz que as regras ficam "definidas pelo sistema"
// e não traz os números, então os valores abaixo são uma PROPOSTA do projeto. Para mudar a pontuação ou os níveis,
// mexa só aqui: o resto do sistema lê estes números.

// Pontos que a pessoa ganha a cada doação confirmada pela instituição (só vale para doação agendada pelo VITTA).
export const PONTOS_POR_DOACAO = 100;

export type Patente = {
  nivel: number;
  nome: string;
  // Quantas doações confirmadas a pessoa precisa ter para chegar nesta patente.
  doacoesNecessarias: number;
};

// Do mais baixo para o mais alto. Quem ainda não doou é "Iniciante".
export const PATENTES: readonly Patente[] = [
  { nivel: 0, nome: "Iniciante", doacoesNecessarias: 0 },
  { nivel: 1, nome: "Bronze", doacoesNecessarias: 1 },
  { nivel: 2, nome: "Prata", doacoesNecessarias: 3 },
  { nivel: 3, nome: "Ouro", doacoesNecessarias: 5 },
  { nivel: 4, nome: "Diamante", doacoesNecessarias: 10 },
];

export type ProximaPatente = Patente & {
  // Quantas doações ainda faltam para chegar nela.
  faltam: number;
};

export type Progresso = {
  patente: Patente;
  // Nulo quando a pessoa já está na maior patente.
  proxima: ProximaPatente | null;
};

// A patente de quem tem este número de doações confirmadas, e o que falta para a próxima.
export function calcularProgresso(doacoes: number): Progresso {
  const alcancadas = PATENTES.filter((p) => doacoes >= p.doacoesNecessarias);
  const patente = alcancadas[alcancadas.length - 1];
  const seguinte = PATENTES.find((p) => p.doacoesNecessarias > doacoes);
  return { patente, proxima: seguinte ? { ...seguinte, faltam: seguinte.doacoesNecessarias - doacoes } : null };
}

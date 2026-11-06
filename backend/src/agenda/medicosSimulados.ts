import { misturar } from "./horario";

// MÉDICOS INVENTADOS (HU-04). Nenhuma dessas pessoas existe: os nomes, as especialidades e os dias de
// atendimento são de mentira, só para o aplicativo ter o que mostrar enquanto não há integração com as instituições.
// Para incluir ou mudar um médico, mexa só aqui.

export type TurnoDeAtendimento = { inicio: string; fim: string };

export type MedicoSimulado = {
  codigo: string;
  nome: string;
  especialidade: string;
  // Dias em que atende: 1 = segunda ... 7 = domingo.
  dias: number[];
  // Em que horas atende em cada um desses dias (o último horário de cada turno termina quando o turno termina).
  turnos: TurnoDeAtendimento[];
  // Quanto dura cada atendimento, em minutos.
  duracaoMin: number;
};

const SEGUNDA_A_SEXTA = [1, 2, 3, 4, 5];
const MANHA: TurnoDeAtendimento = { inicio: "08:00", fim: "12:00" };
const TARDE: TurnoDeAtendimento = { inicio: "13:00", fim: "17:00" };

const medico = (
  codigo: string,
  nome: string,
  especialidade: string,
  dias: number[],
  turnos: TurnoDeAtendimento[],
  duracaoMin = 30,
): MedicoSimulado => ({ codigo, nome, especialidade, dias, turnos, duracaoMin });

const HEMOTERAPIA = "Hemoterapia";
const CLINICA_GERAL = "Clínica geral";

// Quem atende em cada instituição, pelo "codigo" dela (o mesmo de prisma/dados/instituicoes.ts).
// Os turnos respeitam o horário de funcionamento de cada lugar.
const POR_INSTITUICAO: Record<string, MedicoSimulado[]> = {
  // Atende de segunda a sábado, das 7h15 às 18h.
  "hemocentro-de-brasilia": [
    medico("hb-helena-duarte", "Dra. Helena Duarte", HEMOTERAPIA, SEGUNDA_A_SEXTA, [
      { inicio: "07:30", fim: "12:00" },
      { inicio: "13:00", fim: "17:30" },
    ]),
    medico("hb-rafael-menezes", "Dr. Rafael Menezes", CLINICA_GERAL, [1, 3, 5, 6], [
      { inicio: "08:00", fim: "12:00" },
      { inicio: "13:30", fim: "17:30" },
    ]),
    medico("hb-camila-nogueira", "Dra. Camila Nogueira", HEMOTERAPIA, [2, 4, 6], [{ inicio: "07:30", fim: "12:00" }]),
    medico("hb-tiago-albuquerque", "Dr. Tiago Albuquerque", CLINICA_GERAL, SEGUNDA_A_SEXTA, [{ inicio: "13:00", fim: "18:00" }]),
  ],

  // Os postos de demonstração atendem de segunda a sexta, das 8h às 17h.
  "demo-aguas-claras": [
    medico("ac-beatriz-falcao", "Dra. Beatriz Falcão", HEMOTERAPIA, SEGUNDA_A_SEXTA, [MANHA]),
    medico("ac-henrique-prado", "Dr. Henrique Prado", CLINICA_GERAL, [1, 3, 5], [TARDE]),
  ],
  "demo-taguatinga": [
    medico("tg-larissa-monteiro", "Dra. Larissa Monteiro", HEMOTERAPIA, SEGUNDA_A_SEXTA, [MANHA, TARDE]),
    medico("tg-gustavo-ferraz", "Dr. Gustavo Ferraz", CLINICA_GERAL, [2, 4], [MANHA, TARDE]),
  ],
  "demo-ceilandia": [
    medico("ce-patricia-vilela", "Dra. Patrícia Vilela", CLINICA_GERAL, SEGUNDA_A_SEXTA, [MANHA]),
    medico("ce-marcio-bastos", "Dr. Márcio Bastos", HEMOTERAPIA, [2, 3, 4], [TARDE]),
  ],
  "demo-samambaia": [
    medico("sm-renata-queiroz", "Dra. Renata Queiroz", HEMOTERAPIA, [1, 2, 3], [MANHA, TARDE]),
    medico("sm-eduardo-lacerda", "Dr. Eduardo Lacerda", CLINICA_GERAL, [4, 5], [MANHA, TARDE]),
  ],
  "demo-gama": [
    medico("gm-fernanda-coutinho", "Dra. Fernanda Coutinho", CLINICA_GERAL, SEGUNDA_A_SEXTA, [TARDE]),
    medico("gm-andre-sampaio", "Dr. André Sampaio", HEMOTERAPIA, [1, 3, 5], [MANHA]),
  ],
  "demo-sobradinho": [
    medico("sb-juliana-rezende", "Dra. Juliana Rezende", HEMOTERAPIA, SEGUNDA_A_SEXTA, [MANHA]),
    medico("sb-leandro-azevedo", "Dr. Leandro Azevedo", CLINICA_GERAL, [2, 4], [TARDE]),
  ],
  "demo-planaltina": [
    medico("pl-aline-teixeira", "Dra. Aline Teixeira", CLINICA_GERAL, SEGUNDA_A_SEXTA, [MANHA]),
    medico("pl-caio-mendonca", "Dr. Caio Mendonça", HEMOTERAPIA, [1, 3, 5], [TARDE]),
  ],
};

// Para uma instituição que ainda não tem médicos inventados (ex.: uma nova no mapa), sorteia dois do grupo abaixo.
// O sorteio depende só do código da instituição, então é sempre o mesmo par.
const GRUPO_PADRAO: Array<{ nome: string; especialidade: string }> = [
  { nome: "Dra. Clara Medeiros", especialidade: HEMOTERAPIA },
  { nome: "Dr. Otávio Cardoso", especialidade: CLINICA_GERAL },
  { nome: "Dra. Mônica Sales", especialidade: HEMOTERAPIA },
  { nome: "Dr. Vinícius Araújo", especialidade: CLINICA_GERAL },
  { nome: "Dra. Sabrina Furtado", especialidade: HEMOTERAPIA },
  { nome: "Dr. Roberto Fontes", especialidade: CLINICA_GERAL },
];

function medicosPadrao(codigoDaInstituicao: string): MedicoSimulado[] {
  const inicio = misturar(codigoDaInstituicao) % GRUPO_PADRAO.length;
  return [0, 1].map((posicao) => {
    const sorteado = GRUPO_PADRAO[(inicio + posicao * 3) % GRUPO_PADRAO.length];
    return medico(`${codigoDaInstituicao}-padrao-${posicao + 1}`, sorteado.nome, sorteado.especialidade, SEGUNDA_A_SEXTA, [MANHA, TARDE]);
  });
}

export function medicosDaInstituicao(codigoDaInstituicao: string): MedicoSimulado[] {
  return POR_INSTITUICAO[codigoDaInstituicao] ?? medicosPadrao(codigoDaInstituicao);
}

import { requisicao } from "./client";

// O formulário de elegibilidade (HU-03). O app baixa as perguntas da API e monta as telas a partir delas,
// então as regras e os textos ficam num lugar só (o backend).

export type Valor = string | number | boolean;

// Quando uma pergunta aparece: compara com a resposta de outra pergunta do mesmo grupo.
export type Condicao = { id: string; igual: Valor } | { id: string; diferente: Valor } | { e: Condicao[] };

type Base = { id: string; rotulo: string; ajuda?: string; quando?: Condicao };

export type OpcaoEscolha = { id: string; rotulo: string };
export type CampoSimNao = Base & { tipo: "simNao" };
export type CampoEscolha = Base & { tipo: "escolha"; opcoes: OpcaoEscolha[] };
export type CampoData = Base & { tipo: "data" };
export type CampoSimples = CampoSimNao | CampoEscolha | CampoData;

// Marcar uma opção abre os campos dela (ex.: o dia em que tomou a última dose).
export type OpcaoMultipla = { id: string; rotulo: string; campos?: CampoSimples[] };
export type CampoMultipla = Base & { tipo: "multipla"; opcoes: OpcaoMultipla[]; nenhumRotulo: string };
export type CampoNumero = Base & { tipo: "numero"; unidade: string; minimo: number; maximo: number };
export type CampoDeclaracao = Base & { tipo: "declaracao" };
export type Campo = CampoSimples | CampoMultipla | CampoNumero | CampoDeclaracao;

export type Bloco = {
  id: string;
  titulo: string;
  introducao?: string;
  // Bloco com perguntas íntimas: o app avisa que as respostas são confidenciais.
  sensivel?: boolean;
  quando?: Condicao;
  campos: Campo[];
};

export type Modelo = { versaoRegras: string; validadeDias: number; blocos: Bloco[] };

// ---------------------------------------------------------------- resultado
export type Resultado = "APTO" | "INAPTO_TEMPORARIO" | "INAPTO" | "AVALIACAO";

export type Motivo = {
  codigo: string;
  tipo: "TEMPORARIO" | "INAPTO" | "AVALIACAO";
  // Dia a partir do qual a pessoa pode doar (nulo: volte a responder quando a situação mudar).
  ate: string | null;
  mensagem: string;
  fonte: string;
};

export type Formulario = {
  id: string;
  preenchidoEm: string;
  // Último dia em que o formulário vale (AAAA-MM-DD).
  validoAte: string;
  resultado: Resultado;
  liberadoEm: string | null;
  mensagem: string;
  motivos: Motivo[];
  avisos: string[];
  versaoRegras: string;
  vencido: boolean;
  agendamentoLiberado: boolean;
  bloqueioAgendamento: string | null;
};

// Respostas no formato da API: pergunta -> valor (datas em AAAA-MM-DD).
export type Respostas = Record<string, unknown>;

export const apiFormulario = {
  modelo: (token: string) => requisicao<{ modelo: Modelo }>("/doadores/me/formulario/modelo", { token }),

  // Nulo se a pessoa ainda não respondeu.
  atual: (token: string) => requisicao<{ formulario: Formulario | null }>("/doadores/me/formulario", { token }),

  enviar: (token: string, respostas: Respostas) =>
    requisicao<{ formulario: Formulario }>("/doadores/me/formulario", { metodo: "POST", corpo: { respostas }, token }),
};

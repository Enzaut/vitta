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

// validadeDias: quanto tempo vale um formulário em que a pessoa passou (RN-003).
// esperaDias: quanto quem não passou espera para responder de novo (RN-005).
export type Modelo = { versaoRegras: string; validadeDias: number; esperaDias: number; blocos: Bloco[] };

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
  // A resposta do formulário: positiva (passou: APTO ou AVALIACAO) ou negativa (não passou).
  aprovado: boolean;
  // Passou da validade de 7 dias: é preciso responder de novo, tenha passado ou não.
  vencido: boolean;
  agendamentoLiberado: boolean;
  bloqueioAgendamento: string | null;
  // RN-005: quem não passou espera 3 dias para responder de novo (momento exato; nulo para quem passou).
  podeResponderEm: string | null;
  podeResponderAgora: boolean;
};

// RN-004: a conferência que o app faz antes de deixar a pessoa marcar uma doação.
export type CodigoDaVerificacao = "LIBERADO" | "SEM_FORMULARIO" | "VENCIDO" | "NAO_APROVADO";

export type VerificacaoDeAgendamento = {
  liberado: boolean;
  codigo: CodigoDaVerificacao;
  // Por que não está liberado (nulo quando está).
  mensagem: string | null;
  validoAte: string | null;
  podeResponderEm: string | null;
};

// Respostas no formato da API: pergunta -> valor (datas em AAAA-MM-DD).
export type Respostas = Record<string, unknown>;

export const apiFormulario = {
  modelo: (token: string) => requisicao<{ modelo: Modelo }>("/doadores/me/formulario/modelo", { token }),

  // Nulo se a pessoa ainda não respondeu.
  atual: (token: string) => requisicao<{ formulario: Formulario | null }>("/doadores/me/formulario", { token }),

  // Quem não passou e ainda está nos 3 dias de espera recebe erro 429 (com a data na mensagem).
  enviar: (token: string, respostas: Respostas) =>
    requisicao<{ formulario: Formulario }>("/doadores/me/formulario", { metodo: "POST", corpo: { respostas }, token }),

  // RN-004: a API olha o formulário no momento da pergunta (passou? ainda vale?). Chamar antes de cada agendamento.
  verificarAgendamento: (token: string) =>
    requisicao<VerificacaoDeAgendamento>("/doadores/me/agendamento/verificacao", { token }),
};

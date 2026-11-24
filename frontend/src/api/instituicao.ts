import { requisicao } from "./client";
import type { Instituicao } from "./instituicoes";

// Lado da instituição: conta, pedido de inclusão no mapa, estoque e campanhas relâmpago.
// Todas as chamadas levam o token da instituição (papel "instituicao").

export type ContaInstituicao = { id: string; nome: string; email: string; cnpj: string; telefone: string | null };
export type RespostaAuthInstituicao = { token: string; conta: ContaInstituicao };

export type DadosCadastroInstituicao = {
  nome: string;
  email: string;
  cnpj: string;
  telefone?: string;
  senha: string;
  confirmarSenha: string;
};

export type SituacaoDoPedido = "PENDENTE" | "APROVADA" | "RECUSADA";

export type PedidoDeInclusao = {
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone?: string;
  horario: string;
  latitude: number;
  longitude: number;
};

export type Solicitacao = {
  situacao: SituacaoDoPedido;
  motivoRecusa: string | null;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string | null;
  horario: string;
  latitude: number;
  longitude: number;
  criadoEm: string;
  decididaEm: string | null;
};

// Tudo que o painel da instituição precisa.
export type MinhaInstituicao = {
  conta: ContaInstituicao;
  solicitacao: Solicitacao | null;
  // A instituição como aparece no mapa (nula até o pedido ser aprovado).
  instituicao: Instituicao | null;
  // true = quem decide o pedido é uma simulação (ainda não há administrador do VITTA).
  aprovacaoSimulada: boolean;
};

export type SituacaoDaCampanha = "ATIVA" | "ENCERRADA" | "VENCIDA";

export type Campanha = {
  id: string;
  titulo: string;
  descricao: string;
  // Lista vazia = precisa de todos os tipos.
  tiposSanguineos: string[];
  // Último dia da campanha (AAAA-MM-DD).
  validaAte: string;
  situacao: SituacaoDaCampanha;
  encerradaEm: string | null;
  criadaEm: string;
};

export type DadosDaCampanha = {
  titulo: string;
  descricao: string;
  tiposSanguineos: string[];
  validaAte: string;
};

// A campanha como o doador vê, com a instituição que pede ajuda.
export type CampanhaDoDoador = {
  id: string;
  titulo: string;
  descricao: string;
  tiposSanguineos: string[];
  validaAte: string;
  // true = precisa do tipo sanguíneo do doador (ou de todos os tipos).
  paraMeuTipo: boolean;
  instituicao: { id: string; nome: string; cidade: string; uf: string; telefone: string | null; distanciaKm: number | null };
};

const papel = "instituicao" as const;

export const apiInstituicao = {
  cadastrar: (dados: DadosCadastroInstituicao) =>
    requisicao<RespostaAuthInstituicao>("/auth/instituicao/cadastro", { metodo: "POST", corpo: dados, papel }),

  entrar: (email: string, senha: string) =>
    requisicao<RespostaAuthInstituicao>("/auth/instituicao/login", { metodo: "POST", corpo: { email, senha }, papel }),

  minha: (token: string) => requisicao<MinhaInstituicao>("/instituicao/me", { token, papel }),

  excluirConta: (token: string) => requisicao<void>("/instituicao/me", { metodo: "DELETE", token, papel }),

  solicitarInclusao: (token: string, pedido: PedidoDeInclusao) =>
    requisicao<MinhaInstituicao>("/instituicao/me/solicitacao", { metodo: "POST", corpo: pedido, token, papel }),

  // Só na demonstração: faz o papel de quem aprova ou recusa o pedido.
  simularDecisao: (token: string, decisao: "APROVADA" | "RECUSADA", motivo?: string) =>
    requisicao<MinhaInstituicao>("/instituicao/me/solicitacao/simular-decisao", {
      metodo: "POST",
      corpo: { decisao, ...(motivo && { motivo }) },
      token,
      papel,
    }),

  atualizarDados: (token: string, dados: { telefone?: string | null; horario?: string }) =>
    requisicao<MinhaInstituicao>("/instituicao/me/dados", { metodo: "PATCH", corpo: dados, token, papel }),

  atualizarEstoque: (token: string, tiposEmFalta: string[]) =>
    requisicao<MinhaInstituicao>("/instituicao/me/estoque", { metodo: "PATCH", corpo: { tiposEmFalta }, token, papel }),

  listarCampanhas: (token: string) =>
    requisicao<{ campanhas: Campanha[]; total: number }>("/instituicao/me/campanhas", { token, papel }),

  criarCampanha: (token: string, dados: DadosDaCampanha) =>
    requisicao<{ campanha: Campanha }>("/instituicao/me/campanhas", { metodo: "POST", corpo: dados, token, papel }),

  atualizarCampanha: (token: string, id: string, dados: Partial<DadosDaCampanha>) =>
    requisicao<{ campanha: Campanha }>(`/instituicao/me/campanhas/${id}`, { metodo: "PATCH", corpo: dados, token, papel }),

  encerrarCampanha: (token: string, id: string) =>
    requisicao<{ campanha: Campanha }>(`/instituicao/me/campanhas/${id}/encerrar`, { metodo: "POST", token, papel }),

  excluirCampanha: (token: string, id: string) =>
    requisicao<void>(`/instituicao/me/campanhas/${id}`, { metodo: "DELETE", token, papel }),
};

// O doador vê as campanhas ativas das instituições (token de doador).
export const apiCampanhas = {
  listar: (token: string, posicao?: { latitude: number; longitude: number }) => {
    const parametros = posicao ? `?lat=${posicao.latitude.toFixed(3)}&lng=${posicao.longitude.toFixed(3)}` : "";
    return requisicao<{ campanhas: CampanhaDoDoador[]; total: number }>(`/campanhas${parametros}`, { token });
  },
};

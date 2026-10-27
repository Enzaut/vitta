import { requisicao } from "./client";

// telefone: só os dígitos com DDD (ex.: "61999998888"); tipoSanguineo: "A+", "O-"...
// Os dois ficam nulos até a pessoa informar (HU-11).
export type Doador = {
  id: string;
  nome: string;
  email: string;
  dataNascimento: string;
  telefone: string | null;
  tipoSanguineo: string | null;
};
export type RespostaAuth = { token: string; doador: Doador };

// O que a pessoa pode alterar no perfil (HU-11). Nulo apaga o dado.
export type AlteracaoPerfil = { telefone?: string | null; tipoSanguineo?: string | null };

// dataNascimento no formato AAAA-MM-DD (o app converte do DD/MM/AAAA digitado).
export type DadosCadastro = {
  nome: string;
  email: string;
  dataNascimento: string;
  senha: string;
  confirmarSenha: string;
};

// Uma função para cada rota da API.
export const api = {
  cadastrar: (dados: DadosCadastro) => requisicao<RespostaAuth>("/auth/cadastro", { metodo: "POST", corpo: dados }),

  entrar: (email: string, senha: string) =>
    requisicao<RespostaAuth>("/auth/login", { metodo: "POST", corpo: { email, senha } }),

  perfil: (token: string) => requisicao<{ doador: Doador }>("/doadores/me", { token }),

  atualizarPerfil: (token: string, dados: AlteracaoPerfil) =>
    requisicao<{ doador: Doador }>("/doadores/me", { metodo: "PATCH", corpo: dados, token }),

  excluirConta: (token: string) => requisicao<void>("/doadores/me", { metodo: "DELETE", token }),

  // Rota de teste do ambiente: a API está no ar e o banco responde?
  saude: () => requisicao<{ status: string; banco: string }>("/health", { timeoutMs: 6_000 }),
};

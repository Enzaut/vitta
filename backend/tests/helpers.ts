import request from "supertest";
import { expect } from "vitest";
import { criarApp } from "../src/app";
import { prisma } from "../src/db";

// Peças compartilhadas pelos testes da API.
// Os testes usam o banco de desenvolvimento, mas só mexem em e-mails que terminam com @teste.vitta.

export const app = criarApp();
export const SENHA = "Senha@2026";
export const DOMINIO = "@teste.vitta";
export const SEGREDO_DE_TESTE = "segredo-de-teste-apenas";

let contador = 0;
export const novoEmail = () => `maria.${Date.now()}.${contador++}${DOMINIO}`;

export const cadastroValido = (extra: Record<string, unknown> = {}) => ({
  nome: "Maria da Silva",
  email: novoEmail(),
  dataNascimento: "1995-03-15",
  senha: SENHA,
  confirmarSenha: SENHA,
  ...extra,
});

export const limpar = () => prisma.doador.deleteMany({ where: { email: { endsWith: DOMINIO } } });

export async function criarConta(extra: Record<string, unknown> = {}) {
  const dados = cadastroValido(extra);
  const resposta = await request(app).post("/auth/cadastro").send(dados);
  expect(resposta.status).toBe(201);
  return { dados, token: resposta.body.token as string, doador: resposta.body.doador };
}

export const entrar = (email: string, senha: string) => request(app).post("/auth/login").send({ email, senha });

export const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });

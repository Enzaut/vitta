import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { lerTelefone } from "../src/utils/telefone";
import { lerTipoSanguineo } from "../src/utils/tipoSanguineo";
import { MSG_NADA_PARA_ALTERAR, MSG_TELEFONE, MSG_TIPO_SANGUINEO } from "../src/validators/perfilValidator";
import { app, comToken, criarConta, entrar, limpar } from "./helpers";

// Testes da HU-11 (configurar dados do usuário) e do RNF-002 (cada doador só mexe nos próprios dados).

beforeAll(limpar);
afterEach(limpar);
afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

const alterar = (token: string, corpo: Record<string, unknown>) =>
  request(app).patch("/doadores/me").set(comToken(token)).send(corpo);

const perfil = (token: string) => request(app).get("/doadores/me").set(comToken(token));

describe("validação do telefone (função)", () => {
  it.each([
    ["(61) 99999-8888", "61999998888"],
    ["61 99999-8888", "61999998888"],
    ["61999998888", "61999998888"],
    ["+55 (61) 99999-8888", "61999998888"],
    ["5561999998888", "61999998888"],
    ["(11) 3333-4444", "1133334444"],
    ["  (21)99999-0000 ", "21999990000"],
    ["(55) 3333-4444", "5533334444"], // DDD 55 (RS) com 10 dígitos não perde o "55"
  ])("aceita %j e guarda só os dígitos", (entrada, esperado) => {
    expect(lerTelefone(entrada)).toBe(esperado);
  });

  it.each([
    "",
    "123",
    "abc",
    "(61) 99999-88888", // dígitos demais (12)
    "(61) 8888-8888-1", // dígitos demais
    "(61) 89999-8888", // celular precisa começar com 9 depois do DDD
    "(00) 99999-8888", // DDD não pode ter zero
    "(10) 99999-8888",
    "(61) 6999-8888", // fixo começa com 2 a 5
    "99999-8888", // sem DDD
    "9999-8888",
  ])("recusa %j", (entrada) => {
    expect(lerTelefone(entrada)).toBeNull();
  });
});

describe("validação do tipo sanguíneo (função)", () => {
  it.each(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])("aceita %s", (tipo) => {
    expect(lerTipoSanguineo(tipo)).toBe(tipo);
  });

  it("aceita minúsculas e espaços, devolvendo o formato oficial", () => {
    expect(lerTipoSanguineo(" ab- ")).toBe("AB-");
    expect(lerTipoSanguineo("o+")).toBe("O+");
  });

  it.each(["", "A", "C+", "ABC+", "+", "-", "A++", "Z-", "0+", "AB"])("recusa %j", (tipo) => {
    expect(lerTipoSanguineo(tipo)).toBeNull();
  });
});

describe("HU-11: ver os dados atuais", () => {
  it("logo depois do cadastro mostra nome e e-mail, e telefone e tipo sanguíneo vazios", async () => {
    const { dados, token } = await criarConta();
    const resposta = await perfil(token);

    expect(resposta.status).toBe(200);
    expect(resposta.body.doador).toEqual({
      id: expect.any(String),
      nome: "Maria da Silva",
      email: dados.email,
      dataNascimento: "1995-03-15",
      telefone: null,
      tipoSanguineo: null,
    });
  });
});

describe("HU-11: alterar telefone e tipo sanguíneo", () => {
  it("salva os dois, devolve os valores novos e eles continuam lá numa nova sessão", async () => {
    const { dados, token } = await criarConta();

    const alteracao = await alterar(token, { telefone: "(61) 99999-8888", tipoSanguineo: "O-" });
    expect(alteracao.status).toBe(200);
    expect(alteracao.body.doador).toMatchObject({ telefone: "61999998888", tipoSanguineo: "O-" });

    // "Reabrir o app": entra de novo e consulta o perfil.
    const novaSessao = await entrar(dados.email, "Senha@2026");
    const depois = await perfil(novaSessao.body.token);
    expect(depois.body.doador).toMatchObject({ telefone: "61999998888", tipoSanguineo: "O-" });

    // Consulta ao banco: o telefone fica só com dígitos e o tipo vira o valor do tipo enumerado.
    const noBanco = await prisma.$queryRaw<{ telefone: string; tipo: string }[]>`
      SELECT "telefone", "tipoSanguineo"::text AS tipo FROM "doadores" WHERE "email" = ${dados.email}`;
    expect(noBanco[0]).toEqual({ telefone: "61999998888", tipo: "O-" });
  });

  it("altera só o telefone sem mexer no tipo sanguíneo, e vice-versa", async () => {
    const { token } = await criarConta();
    await alterar(token, { telefone: "11999990000", tipoSanguineo: "A+" });

    const soTelefone = await alterar(token, { telefone: "(21) 98888-7777" });
    expect(soTelefone.body.doador).toMatchObject({ telefone: "21988887777", tipoSanguineo: "A+" });

    const soTipo = await alterar(token, { tipoSanguineo: "b-" });
    expect(soTipo.body.doador).toMatchObject({ telefone: "21988887777", tipoSanguineo: "B-" });
  });

  it("aceita todos os 8 tipos sanguíneos", async () => {
    const { token } = await criarConta();
    for (const tipo of ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]) {
      const resposta = await alterar(token, { tipoSanguineo: tipo });
      expect(resposta.status).toBe(200);
      expect(resposta.body.doador.tipoSanguineo).toBe(tipo);
    }
  });

  it("texto vazio ou nulo apaga o dado", async () => {
    const { token } = await criarConta();
    await alterar(token, { telefone: "61999998888", tipoSanguineo: "AB+" });

    const apagou = await alterar(token, { telefone: "", tipoSanguineo: null });

    expect(apagou.status).toBe(200);
    expect(apagou.body.doador).toMatchObject({ telefone: null, tipoSanguineo: null });
  });

  it("não deixa alterar nome, e-mail nem data de nascimento por aqui", async () => {
    const { dados, token } = await criarConta();

    const resposta = await alterar(token, { telefone: "61999998888", nome: "Outro Nome", email: "outro@teste.vitta" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.doador).toMatchObject({ nome: "Maria da Silva", email: dados.email });
  });
});

describe("HU-11: valores inválidos são recusados com mensagem clara", () => {
  it.each(["123", "abc", "(61) 99999-88888", "(00) 99999-8888", "(61) 89999-8888", "99999-8888"])(
    "telefone fora do formato (%s)",
    async (telefone) => {
      const { token } = await criarConta();
      await alterar(token, { telefone: "61999998888" });

      const resposta = await alterar(token, { telefone });

      expect(resposta.status).toBe(400);
      expect(resposta.body.campos.telefone).toBe(MSG_TELEFONE);
      // O que já estava salvo continua igual.
      expect((await perfil(token)).body.doador.telefone).toBe("61999998888");
    },
  );

  it.each(["C+", "AB", "A++", "O", "0+", "positivo"])("tipo sanguíneo fora da lista (%s)", async (tipoSanguineo) => {
    const { token } = await criarConta();
    await alterar(token, { tipoSanguineo: "A+" });

    const resposta = await alterar(token, { tipoSanguineo });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.tipoSanguineo).toBe(MSG_TIPO_SANGUINEO);
    expect((await perfil(token)).body.doador.tipoSanguineo).toBe("A+");
  });

  it("telefone com tipo de dado errado (número em vez de texto)", async () => {
    const { token } = await criarConta();
    const resposta = await alterar(token, { telefone: 61999998888 });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.telefone).toBe(MSG_TELEFONE);
  });

  it("um campo inválido recusa a alteração inteira, mesmo com o outro válido", async () => {
    const { token } = await criarConta();

    const resposta = await alterar(token, { telefone: "61999998888", tipoSanguineo: "X+" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ tipoSanguineo: MSG_TIPO_SANGUINEO });
    expect((await perfil(token)).body.doador.telefone).toBeNull();
  });

  it("os dois inválidos mostram as duas mensagens", async () => {
    const { token } = await criarConta();
    const resposta = await alterar(token, { telefone: "1", tipoSanguineo: "Q" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ telefone: MSG_TELEFONE, tipoSanguineo: MSG_TIPO_SANGUINEO });
  });

  it("corpo vazio não altera nada", async () => {
    const { token } = await criarConta();
    const resposta = await alterar(token, {});

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.corpo).toBe(MSG_NADA_PARA_ALTERAR);
  });
});

describe("RNF-002: controle de acesso", () => {
  it("sem token não altera nada", async () => {
    const resposta = await request(app).patch("/doadores/me").send({ telefone: "61999998888" });
    expect(resposta.status).toBe(401);
  });

  it("cada doador altera e vê só os próprios dados", async () => {
    const maria = await criarConta();
    const joao = await criarConta({ nome: "João Souza" });

    await alterar(maria.token, { telefone: "61999998888", tipoSanguineo: "A+" });
    await alterar(joao.token, { telefone: "11988887777", tipoSanguineo: "O-" });

    expect((await perfil(maria.token)).body.doador).toMatchObject({ telefone: "61999998888", tipoSanguineo: "A+" });
    expect((await perfil(joao.token)).body.doador).toMatchObject({ telefone: "11988887777", tipoSanguineo: "O-" });
  });

  it("usar o id de outro doador recebe 403 e não altera nada (detalhes em acesso.test.ts)", async () => {
    const maria = await criarConta();
    const joao = await criarConta({ nome: "João Souza" });

    const resposta = await request(app)
      .patch(`/doadores/${joao.doador.id}`)
      .set(comToken(maria.token))
      .send({ telefone: "61999998888" });

    expect(resposta.status).toBe(403);
    expect((await perfil(joao.token)).body.doador.telefone).toBeNull();
  });
});

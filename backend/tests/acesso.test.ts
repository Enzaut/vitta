import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { SENHA, app, comToken, criarConta, entrar, limpar } from "./helpers";

// RNF-002: cada doador acessa e altera apenas os próprios dados.
// Cenário da matriz (E2-3): com o token do doador A, chamar as rotas usando o id do doador B.

const MSG_PROIBIDO = "Você não tem permissão para acessar os dados de outro doador.";

beforeAll(limpar);
afterEach(limpar);
afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

// Cria A e B; B já tem telefone e tipo sanguíneo, para dar para notar se alguém mexer.
async function doisDoadores() {
  const a = await criarConta({ nome: "Doador A" });
  const b = await criarConta({ nome: "Doador B" });
  await request(app).patch("/doadores/me").set(comToken(b.token)).send({ telefone: "11988887777", tipoSanguineo: "O-" });
  return { a, b };
}

async function dadosDoBanco(email: string) {
  return prisma.doador.findUnique({ where: { email } });
}

describe("RNF-002: o token de A não abre os dados de B", () => {
  // As rotas do cenário: perfil, alteração, exclusão e o formulário de análise (HU-03, que ainda vai nascer
  // e já fica protegido pela mesma regra, porque o caminho começa com /doadores/:id).
  const rotas: Array<{ nome: string; metodo: "get" | "patch" | "delete" | "post"; caminho: (id: string) => string; corpo?: object }> = [
    { nome: "ver o perfil", metodo: "get", caminho: (id) => `/doadores/${id}` },
    { nome: "alterar o perfil", metodo: "patch", caminho: (id) => `/doadores/${id}`, corpo: { telefone: "61999998888", tipoSanguineo: "A+" } },
    { nome: "excluir a conta", metodo: "delete", caminho: (id) => `/doadores/${id}` },
    { nome: "ver o formulário", metodo: "get", caminho: (id) => `/doadores/${id}/formulario` },
    { nome: "enviar o formulário", metodo: "post", caminho: (id) => `/doadores/${id}/formulario`, corpo: { qualquer: "coisa" } },
  ];

  it.each(rotas)("A tenta $nome de B: 403, e nada de B muda", async ({ metodo, caminho, corpo }) => {
    const { a, b } = await doisDoadores();

    const resposta = await request(app)[metodo](caminho(b.doador.id)).set(comToken(a.token)).send(corpo);

    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ mensagem: MSG_PROIBIDO });

    // B continua existindo, com os mesmos dados, e consegue entrar.
    const noBanco = await dadosDoBanco(b.dados.email);
    expect(noBanco).toMatchObject({ nome: "Doador B", telefone: "11988887777", tipoSanguineo: "O_NEGATIVO" });
    expect((await entrar(b.dados.email, SENHA)).status).toBe(200);
  });

  it("a recusa não vaza nada de B (nem nome, e-mail ou telefone)", async () => {
    const { a, b } = await doisDoadores();

    const resposta = await request(app).get(`/doadores/${b.doador.id}`).set(comToken(a.token));

    const texto = JSON.stringify(resposta.body);
    expect(texto).not.toContain("Doador B");
    expect(texto).not.toContain(b.dados.email);
    expect(texto).not.toContain("11988887777");
  });

  it("id que não existe também recebe 403 (a resposta não revela quais ids existem)", async () => {
    const { a } = await doisDoadores();

    const resposta = await request(app).get(`/doadores/${randomUUID()}`).set(comToken(a.token));

    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ mensagem: MSG_PROIBIDO });
  });

  it("o id de B em maiúsculas também é recusado", async () => {
    const { a, b } = await doisDoadores();

    const resposta = await request(app).get(`/doadores/${b.doador.id.toUpperCase()}`).set(comToken(a.token));

    expect(resposta.status).toBe(403);
  });

  it("sem token a resposta é 401 (antes de olhar o id)", async () => {
    const { b } = await doisDoadores();

    expect((await request(app).get(`/doadores/${b.doador.id}`)).status).toBe(401);
    expect((await request(app).patch(`/doadores/${b.doador.id}`).send({ telefone: "61999998888" })).status).toBe(401);
    expect((await request(app).delete(`/doadores/${b.doador.id}`)).status).toBe(401);
    expect((await request(app).get(`/doadores/${b.doador.id}/formulario`)).status).toBe(401);
  });
});

describe("RNF-002: cada doador usa os próprios dados normalmente", () => {
  it("A acessa e altera os próprios dados por /me e pelo próprio id", async () => {
    const { a } = await doisDoadores();

    const porMe = await request(app).get("/doadores/me").set(comToken(a.token));
    const porId = await request(app).get(`/doadores/${a.doador.id}`).set(comToken(a.token));
    expect(porMe.status).toBe(200);
    expect(porId.status).toBe(200);
    expect(porId.body.doador.id).toBe(a.doador.id);

    const alteracao = await request(app)
      .patch(`/doadores/${a.doador.id}`)
      .set(comToken(a.token))
      .send({ telefone: "61999998888", tipoSanguineo: "B+" });
    expect(alteracao.status).toBe(200);
    expect(alteracao.body.doador).toMatchObject({ id: a.doador.id, telefone: "61999998888", tipoSanguineo: "B+" });
  });

  it("A exclui a própria conta pelo id e a conta de B não é afetada", async () => {
    const { a, b } = await doisDoadores();

    const exclusao = await request(app).delete(`/doadores/${a.doador.id}`).set(comToken(a.token));

    expect(exclusao.status).toBe(204);
    expect(await dadosDoBanco(a.dados.email)).toBeNull();
    expect(await dadosDoBanco(b.dados.email)).not.toBeNull();
  });

  it("cada um vê só o que é seu", async () => {
    const { a, b } = await doisDoadores();

    const deA = await request(app).get("/doadores/me").set(comToken(a.token));
    const deB = await request(app).get("/doadores/me").set(comToken(b.token));

    expect(deA.body.doador).toMatchObject({ id: a.doador.id, nome: "Doador A", telefone: null });
    expect(deB.body.doador).toMatchObject({ id: b.doador.id, nome: "Doador B", telefone: "11988887777", tipoSanguineo: "O-" });
  });
});

describe("RNF-002: não há caminho para listar ou alcançar vários doadores", () => {
  it.each(["/doadores", "/doadores/"])("GET %s não existe", async (caminho) => {
    const { a } = await doisDoadores();

    const resposta = await request(app).get(caminho).set(comToken(a.token));

    expect(resposta.status).toBe(404);
  });

  it("os campos protegidos não mudam por um PATCH, mesmo se o pedido tentar enviá-los", async () => {
    const { a } = await criarConta({ nome: "Doador A" }).then((conta) => ({ a: conta }));
    const antes = await dadosDoBanco(a.dados.email);

    const resposta = await request(app)
      .patch("/doadores/me")
      .set(comToken(a.token))
      .send({
        telefone: "61999998888",
        id: randomUUID(),
        nome: "Nome Trocado",
        email: "trocado@teste.vitta",
        dataNascimento: "2000-01-01",
        senhaHash: "$2b$12$hashfalsoqualquer",
        tentativasFalhas: 4,
        bloqueadoAte: "2999-01-01T00:00:00.000Z",
        criadoEm: "2000-01-01T00:00:00.000Z",
      });

    expect(resposta.status).toBe(200);
    const depois = await dadosDoBanco(a.dados.email);
    expect(depois).toMatchObject({
      id: antes!.id,
      nome: antes!.nome,
      email: antes!.email,
      senhaHash: antes!.senhaHash,
      tentativasFalhas: 0,
      bloqueadoAte: null,
      telefone: "61999998888",
    });
    expect(depois!.dataNascimento).toEqual(antes!.dataNascimento);
    expect(depois!.criadoEm).toEqual(antes!.criadoEm);
  });

  it("nenhuma resposta traz senha, hash nem controle de bloqueio", async () => {
    const dados = { nome: "Doador A", email: `vazamento.${Date.now()}@teste.vitta`, dataNascimento: "1995-03-15", senha: SENHA };
    const cadastro = await request(app).post("/auth/cadastro").send(dados);
    const login = await entrar(dados.email, SENHA);
    const perfil = await request(app).get("/doadores/me").set(comToken(cadastro.body.token));
    const alteracao = await request(app).patch("/doadores/me").set(comToken(cadastro.body.token)).send({ telefone: "61999998888" });

    for (const resposta of [cadastro, login, perfil, alteracao]) {
      const texto = JSON.stringify(resposta.body);
      expect(texto).not.toContain("senhaHash");
      expect(texto).not.toContain("$2b$");
      expect(texto).not.toContain(SENHA);
      expect(texto).not.toContain("tentativasFalhas");
      expect(texto).not.toContain("bloqueadoAte");
    }
  });
});

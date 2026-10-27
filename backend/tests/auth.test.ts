import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { MAX_FALHAS } from "../src/services/AuthService";
import { DOMINIO, SEGREDO_DE_TESTE, SENHA, app, cadastroValido, criarConta, entrar, limpar, novoEmail } from "./helpers";

// Testes de HU-01 (cadastro e login), HU-02 (excluir conta) e RNF-003 (JWT).

beforeAll(limpar);
afterEach(limpar);
afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("ambiente", () => {
  it("GET /health confirma API e banco no ar", async () => {
    const resposta = await request(app).get("/health");
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: "ok", banco: "ok" });
  });
});

describe("HU-01: cadastro", () => {
  it("cenário 1: cria a conta, devolve o token JWT e não guarda a senha em texto puro", async () => {
    const dados = cadastroValido();
    const resposta = await request(app).post("/auth/cadastro").send(dados);

    expect(resposta.status).toBe(201);
    expect(resposta.body.doador).toEqual({
      id: expect.any(String),
      nome: "Maria da Silva",
      email: dados.email,
      dataNascimento: "1995-03-15",
      telefone: null,
      tipoSanguineo: null,
    });
    expect(JSON.stringify(resposta.body)).not.toContain(SENHA);
    expect(jwt.verify(resposta.body.token, SEGREDO_DE_TESTE).sub).toBe(resposta.body.doador.id);

    // RE03: no banco fica só o hash bcrypt.
    const noBanco = await prisma.doador.findUniqueOrThrow({ where: { email: dados.email } });
    expect(noBanco.senhaHash).not.toBe(SENHA);
    expect(noBanco.senhaHash).toMatch(/^\$2[aby]\$/);
  });

  it("cenário 4: campos obrigatórios em branco são recusados", async () => {
    const resposta = await request(app).post("/auth/cadastro").send({});

    expect(resposta.status).toBe(400);
    for (const campo of ["nome", "email", "dataNascimento", "senha"]) {
      expect(resposta.body.campos[campo]).toBe("Este campo é obrigatório.");
    }
    expect(await prisma.doador.count({ where: { email: { endsWith: DOMINIO } } })).toBe(0);
  });

  it("cenário 5: e-mail já cadastrado não cria outra conta", async () => {
    const { dados } = await criarConta();
    const resposta = await request(app).post("/auth/cadastro").send(cadastroValido({ email: dados.email }));

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toBe("Este e-mail já está em uso. Faça login ou recupere sua senha.");
    expect(await prisma.doador.count({ where: { email: dados.email } })).toBe(1);
  });

  it("o e-mail não diferencia maiúsculas de minúsculas", async () => {
    const { dados } = await criarConta();
    const resposta = await request(app)
      .post("/auth/cadastro")
      .send(cadastroValido({ email: dados.email.toUpperCase() }));

    expect(resposta.status).toBe(409);
  });

  it.each(["mariaemail.com", "maria@", "maria@email", "  "])("cenário 6: e-mail inválido (%j) é recusado", async (email) => {
    const resposta = await request(app).post("/auth/cadastro").send(cadastroValido({ email }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.email).toMatch(/^(Informe um endereço de e-mail válido\.|Este campo é obrigatório\.)$/);
  });

  it("e-mail em formato inválido mostra a mensagem da HU-01", async () => {
    const resposta = await request(app).post("/auth/cadastro").send(cadastroValido({ email: "mariaemail.com" }));
    expect(resposta.body.campos.email).toBe("Informe um endereço de e-mail válido.");
  });

  it.each(["senha123", "Senha2026", "Senha@abc", "Sn@1", "senha@2026"])("recusa senha fora da regra RN06 (%s)", async (senha) => {
    const resposta = await request(app).post("/auth/cadastro").send(cadastroValido({ senha, confirmarSenha: senha }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.senha).toContain("A senha deve ter no mínimo 8 caracteres");
  });

  it("recusa confirmação de senha diferente", async () => {
    const resposta = await request(app).post("/auth/cadastro").send(cadastroValido({ confirmarSenha: "Outra@2026" }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.confirmarSenha).toBe("As senhas não coincidem.");
  });

  it.each(["15/03/1995", "1995-02-31", "2999-01-01", "1800-01-01"])("recusa data de nascimento inválida (%s)", async (dataNascimento) => {
    const resposta = await request(app).post("/auth/cadastro").send(cadastroValido({ dataNascimento }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.dataNascimento).toBeDefined();
  });

  it("recusa corpo que não é JSON", async () => {
    const resposta = await request(app).post("/auth/cadastro").set("Content-Type", "application/json").send("{isso não é json");
    expect(resposta.status).toBe(400);
  });
});

describe("HU-01: login", () => {
  it("cenário 2: e-mail e senha corretos devolvem um token que abre rotas protegidas", async () => {
    const { dados } = await criarConta();
    const resposta = await entrar(dados.email, SENHA);

    expect(resposta.status).toBe(200);
    const perfil = await request(app).get("/doadores/me").set("Authorization", `Bearer ${resposta.body.token}`);
    expect(perfil.status).toBe(200);
    expect(perfil.body.doador.email).toBe(dados.email);
  });

  it("aceita o e-mail com maiúsculas e espaços", async () => {
    const { dados } = await criarConta();
    const resposta = await entrar(`  ${dados.email.toUpperCase()} `, SENHA);
    expect(resposta.status).toBe(200);
  });

  it("cenário 3: senha errada mostra a mensagem de erro", async () => {
    const { dados } = await criarConta();
    const resposta = await entrar(dados.email, "senhaErrada123");

    expect(resposta.status).toBe(401);
    expect(resposta.body.mensagem).toBe("E-mail ou senha incorretos. Verifique seus dados e tente novamente.");
  });

  it("e-mail sem conta recebe a mesma mensagem (não revela quem tem conta)", async () => {
    const resposta = await entrar(novoEmail(), SENHA);

    expect(resposta.status).toBe(401);
    expect(resposta.body.mensagem).toBe("E-mail ou senha incorretos. Verifique seus dados e tente novamente.");
  });

  it("cenário 3: na 5ª falha seguida a conta fica bloqueada por 15 minutos, até com a senha certa", async () => {
    const { dados } = await criarConta();

    for (let i = 1; i < MAX_FALHAS; i++) {
      expect((await entrar(dados.email, "senhaErrada123")).status).toBe(401);
    }
    const quinta = await entrar(dados.email, "senhaErrada123");
    expect(quinta.status).toBe(429);
    expect(quinta.body.mensagem).toBe("Muitas tentativas incorretas. Tente novamente em 15 minutos.");

    const comSenhaCerta = await entrar(dados.email, SENHA);
    expect(comSenhaCerta.status).toBe(429);

    const noBanco = await prisma.doador.findUniqueOrThrow({ where: { email: dados.email } });
    const minutos = (noBanco.bloqueadoAte!.getTime() - Date.now()) / 60_000;
    expect(minutos).toBeGreaterThan(14);
    expect(minutos).toBeLessThanOrEqual(15);
  });

  it("depois que o bloqueio vence, a senha certa volta a funcionar", async () => {
    const { dados } = await criarConta();
    for (let i = 0; i < MAX_FALHAS; i++) await entrar(dados.email, "senhaErrada123");
    await prisma.doador.update({ where: { email: dados.email }, data: { bloqueadoAte: new Date(Date.now() - 1000) } });

    const resposta = await entrar(dados.email, SENHA);

    expect(resposta.status).toBe(200);
    const noBanco = await prisma.doador.findUniqueOrThrow({ where: { email: dados.email } });
    expect(noBanco.tentativasFalhas).toBe(0);
    expect(noBanco.bloqueadoAte).toBeNull();
  });

  it("um login certo zera a contagem: só falhas SEGUIDAS bloqueiam", async () => {
    const { dados } = await criarConta();

    await entrar(dados.email, "errada1");
    await entrar(dados.email, "errada2");
    expect((await entrar(dados.email, SENHA)).status).toBe(200);
    for (let i = 0; i < MAX_FALHAS - 1; i++) {
      expect((await entrar(dados.email, "errada3")).status).toBe(401);
    }
  });

  it("cenário 4: campos em branco no login são recusados", async () => {
    const resposta = await request(app).post("/auth/login").send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.email).toBe("Este campo é obrigatório.");
    expect(resposta.body.campos.senha).toBe("Este campo é obrigatório.");
  });

  it("cenário 6: e-mail inválido no login mostra a mensagem da HU-01", async () => {
    const resposta = await entrar("maria@", SENHA);

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.email).toBe("Informe um endereço de e-mail válido.");
  });
});

describe("RNF-003: rotas protegidas exigem token JWT válido", () => {
  const rotas = [
    ["get", "/doadores/me"],
    ["patch", "/doadores/me"],
    ["delete", "/doadores/me"],
  ] as const;

  it.each(rotas)("%s %s sem token devolve 401", async (metodo, caminho) => {
    expect((await request(app)[metodo](caminho)).status).toBe(401);
  });

  it.each(rotas)("%s %s com token alterado devolve 401", async (metodo, caminho) => {
    const { token } = await criarConta();
    const alterado = token.slice(0, -4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");

    expect((await request(app)[metodo](caminho).set("Authorization", `Bearer ${alterado}`)).status).toBe(401);
  });

  it.each(rotas)("%s %s com token vencido devolve 401", async (metodo, caminho) => {
    const { doador } = await criarConta();
    const vencido = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 60 }, SEGREDO_DE_TESTE, { subject: doador.id });

    expect((await request(app)[metodo](caminho).set("Authorization", `Bearer ${vencido}`)).status).toBe(401);
  });

  it("token assinado com outro segredo devolve 401", async () => {
    const { doador } = await criarConta();
    const falso = jwt.sign({}, "outro-segredo", { subject: doador.id, expiresIn: "1h" });

    expect((await request(app).get("/doadores/me").set("Authorization", `Bearer ${falso}`)).status).toBe(401);
  });

  it("cabeçalho sem 'Bearer' devolve 401", async () => {
    const { token } = await criarConta();

    expect((await request(app).get("/doadores/me").set("Authorization", token)).status).toBe(401);
  });
});

describe("HU-02: excluir cadastro (LGPD)", () => {
  it("apaga a conta, e o token antigo e o login deixam de funcionar", async () => {
    const { dados, token } = await criarConta();

    const exclusao = await request(app).delete("/doadores/me").set("Authorization", `Bearer ${token}`);
    expect(exclusao.status).toBe(204);

    expect(await prisma.doador.count({ where: { email: dados.email } })).toBe(0);
    expect((await request(app).get("/doadores/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
    expect((await entrar(dados.email, SENHA)).status).toBe(401);
  });

  it("sem token não exclui nada", async () => {
    const { dados } = await criarConta();

    expect((await request(app).delete("/doadores/me")).status).toBe(401);
    expect(await prisma.doador.count({ where: { email: dados.email } })).toBe(1);
  });

  it("um doador não consegue excluir a conta de outro", async () => {
    const maria = await criarConta();
    const joao = await criarConta({ nome: "João Souza" });

    await request(app).delete("/doadores/me").set("Authorization", `Bearer ${joao.token}`);

    expect(await prisma.doador.count({ where: { email: maria.dados.email } })).toBe(1);
    expect(await prisma.doador.count({ where: { email: joao.dados.email } })).toBe(0);
  });
});

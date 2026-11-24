import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { env } from "../src/config/env";
import { prisma } from "../src/db";
import { completarCnpj } from "../src/utils/cnpj";
import { lerCredencial } from "../src/utils/token";
import { definirRelogio } from "../src/utils/relogio";
import { BLOQUEIO_MINUTOS, MAX_FALHAS } from "../src/services/AuthService";
import { DOMINIO, SEGREDO_DE_TESTE, SENHA, app, comToken, criarConta, limpar } from "./helpers";

// Lado da instituição: cadastro e login, pedido de inclusão no mapa, estoque e campanhas.
// Tudo de teste usa e-mail @teste.vitta e nomes começando com "Teste " (o código da instituição vira "teste-...").
// A instituição aprovada fica num ponto longe do Brasil (10°N, 10°L), para nunca se misturar com as reais.

let contador = 0;
const novoEmail = () => `hemocentro.${Date.now()}.${contador++}${DOMINIO}`;
const novoCnpj = () => completarCnpj(String(100_000_000_000 + Date.now() * 10 + contador++).slice(-12));

const cadastroValido = (extra: Record<string, unknown> = {}) => ({
  nome: "Teste Hemocentro Central",
  email: novoEmail(),
  cnpj: novoCnpj(),
  telefone: "(61) 3327-4413",
  senha: SENHA,
  confirmarSenha: SENHA,
  ...extra,
});

const pedidoValido = (extra: Record<string, unknown> = {}) => ({
  nome: "Teste Hemocentro Central",
  endereco: "Rua de Teste, 1",
  cidade: "Cidade de Teste",
  uf: "df",
  telefone: "(61) 3327-4413",
  horario: "Segunda a sexta, das 8h às 17h",
  latitude: 10,
  longitude: 10,
  ...extra,
});

async function criarInstituicao(extra: Record<string, unknown> = {}) {
  const dados = cadastroValido(extra);
  const resposta = await request(app).post("/auth/instituicao/cadastro").send(dados);
  expect(resposta.status).toBe(201);
  return { dados, token: resposta.body.token as string, conta: resposta.body.conta };
}

// Cria a conta e já deixa a instituição aprovada no mapa.
async function criarInstituicaoAprovada(extra: Record<string, unknown> = {}, pedido: Record<string, unknown> = {}) {
  const { dados, token, conta } = await criarInstituicao(extra);
  expect((await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido(pedido))).status).toBe(201);
  const decisao = await request(app)
    .post("/instituicao/me/solicitacao/simular-decisao")
    .set(comToken(token))
    .send({ decisao: "APROVADA" });
  expect(decisao.status).toBe(200);
  return { dados, token, conta, instituicao: decisao.body.instituicao as { id: string; nome: string } };
}

const amanha = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const emDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const campanhaValida = (extra: Record<string, unknown> = {}) => ({
  titulo: "Falta O negativo",
  descricao: "Estamos com o estoque de O negativo muito baixo. Venha doar!",
  tiposSanguineos: ["O-"],
  validaAte: emDias(5),
  ...extra,
});

const limparTudo = async () => {
  await prisma.instituicao.deleteMany({ where: { codigo: { startsWith: "teste-" } } });
  await prisma.contaInstituicao.deleteMany({ where: { email: { endsWith: DOMINIO } } });
  await limpar();
};

beforeAll(limparTudo);
afterEach(() => definirRelogio(null));
afterAll(async () => {
  await limparTudo();
  await prisma.$disconnect();
});

describe("cadastro da instituição", () => {
  it("cria a conta, devolve um token com papel de instituição e não devolve a senha", async () => {
    const { dados, token, conta } = await criarInstituicao();
    expect(conta).toMatchObject({ nome: dados.nome, email: dados.email, cnpj: dados.cnpj.replace(/\D/g, ""), telefone: "6133274413" });
    expect(JSON.stringify(conta)).not.toMatch(/senha|hash/i);
    expect(lerCredencial(token)).toMatchObject({ id: conta.id, papel: "instituicao" });

    const noBanco = await prisma.contaInstituicao.findUniqueOrThrow({ where: { id: conta.id } });
    expect(noBanco.senhaHash).not.toContain(SENHA);
    expect(noBanco.instituicaoId).toBeNull();
  });

  it("aceita CNPJ com pontuação e guarda só os dígitos", async () => {
    const digitos = novoCnpj();
    const comMascara = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
    const { conta } = await criarInstituicao({ cnpj: comMascara });
    expect(conta.cnpj).toBe(digitos);
  });

  it.each([
    ["CNPJ com dígito verificador errado", { cnpj: "11.222.333/0001-80" }, "cnpj"],
    ["CNPJ repetido (todos os dígitos iguais)", { cnpj: "11111111111111" }, "cnpj"],
    ["CNPJ curto", { cnpj: "123" }, "cnpj"],
    ["nome curto", { nome: "ab" }, "nome"],
    ["e-mail inválido", { email: "sem-arroba" }, "email"],
    ["senha fraca", { senha: "senhafraca", confirmarSenha: "senhafraca" }, "senha"],
    ["senhas diferentes", { confirmarSenha: "Outra@2026" }, "confirmarSenha"],
    ["telefone fora do formato", { telefone: "123" }, "telefone"],
  ])("recusa %s com 400 e a mensagem do campo", async (_nome, extra, campo) => {
    const resposta = await request(app).post("/auth/instituicao/cadastro").send(cadastroValido(extra));
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[campo]).toBeTruthy();
  });

  it("campos em branco devolvem 400 com a mensagem de cada um", async () => {
    const resposta = await request(app).post("/auth/instituicao/cadastro").send({});
    expect(resposta.status).toBe(400);
    expect(Object.keys(resposta.body.campos)).toEqual(expect.arrayContaining(["nome", "email", "cnpj", "senha"]));
  });

  it("e-mail repetido e CNPJ repetido devolvem 409 e não criam outra conta", async () => {
    const { dados } = await criarInstituicao();
    const repetidoEmail = await request(app).post("/auth/instituicao/cadastro").send(cadastroValido({ email: dados.email }));
    expect(repetidoEmail.status).toBe(409);
    expect(repetidoEmail.body.campos.email).toBeTruthy();

    const repetidoCnpj = await request(app).post("/auth/instituicao/cadastro").send(cadastroValido({ cnpj: dados.cnpj }));
    expect(repetidoCnpj.status).toBe(409);
    expect(repetidoCnpj.body.campos.cnpj).toBeTruthy();
  });

  it("o e-mail da conta de instituição não conflita com o de um doador (são contas diferentes)", async () => {
    const doador = await criarConta();
    const resposta = await request(app).post("/auth/instituicao/cadastro").send(cadastroValido({ email: doador.dados.email }));
    expect(resposta.status).toBe(201);
  });
});

describe("login da instituição", () => {
  it("entra com e-mail e senha certos e recebe um token de instituição", async () => {
    const { dados, conta } = await criarInstituicao();
    const resposta = await request(app).post("/auth/instituicao/login").send({ email: dados.email.toUpperCase(), senha: SENHA });
    expect(resposta.status).toBe(200);
    expect(resposta.body.conta.id).toBe(conta.id);
    expect(lerCredencial(resposta.body.token)).toMatchObject({ id: conta.id, papel: "instituicao" });
  });

  it("senha errada e e-mail que não existe dão 401 com a mesma mensagem", async () => {
    const { dados } = await criarInstituicao();
    const senhaErrada = await request(app).post("/auth/instituicao/login").send({ email: dados.email, senha: "Errada@2026" });
    const semConta = await request(app).post("/auth/instituicao/login").send({ email: novoEmail(), senha: SENHA });
    expect(senhaErrada.status).toBe(401);
    expect(semConta.status).toBe(401);
    expect(semConta.body.mensagem).toBe(senhaErrada.body.mensagem);
  });

  it("campos em branco dão 400", async () => {
    const resposta = await request(app).post("/auth/instituicao/login").send({});
    expect(resposta.status).toBe(400);
  });

  it(`${MAX_FALHAS} senhas erradas seguidas bloqueiam a conta por ${BLOQUEIO_MINUTOS} minutos (até a senha certa é recusada)`, async () => {
    const { dados } = await criarInstituicao();
    for (let i = 1; i < MAX_FALHAS; i++) {
      expect((await request(app).post("/auth/instituicao/login").send({ email: dados.email, senha: "Errada@2026" })).status).toBe(401);
    }
    expect((await request(app).post("/auth/instituicao/login").send({ email: dados.email, senha: "Errada@2026" })).status).toBe(429);
    expect((await request(app).post("/auth/instituicao/login").send({ email: dados.email, senha: SENHA })).status).toBe(429);
  });

  it("a conta do doador não entra pelo login da instituição, e a da instituição não entra pelo login do doador", async () => {
    const doador = await criarConta();
    const { dados } = await criarInstituicao();
    expect((await request(app).post("/auth/instituicao/login").send({ email: doador.dados.email, senha: SENHA })).status).toBe(401);
    expect((await request(app).post("/auth/login").send({ email: dados.email, senha: SENHA })).status).toBe(401);
  });
});

describe("papéis: doador e instituição não se misturam (RNF-002)", () => {
  it("sem token ou com token alterado, o painel da instituição responde 401", async () => {
    expect((await request(app).get("/instituicao/me")).status).toBe(401);
    const { token } = await criarInstituicao();
    const alterado = token.slice(0, -4) + "AAAA";
    expect((await request(app).get("/instituicao/me").set(comToken(alterado))).status).toBe(401);
  });

  it("token de doador no painel da instituição: 403", async () => {
    const { token } = await criarConta();
    const rotas = [
      ["get", "/instituicao/me"],
      ["delete", "/instituicao/me"],
      ["post", "/instituicao/me/solicitacao"],
      ["post", "/instituicao/me/solicitacao/simular-decisao"],
      ["patch", "/instituicao/me/dados"],
      ["patch", "/instituicao/me/estoque"],
      ["get", "/instituicao/me/campanhas"],
      ["post", "/instituicao/me/campanhas"],
    ] as const;
    for (const [metodo, caminho] of rotas) {
      const resposta = await request(app)[metodo](caminho).set(comToken(token)).send({});
      expect(resposta.status, `${metodo} ${caminho}`).toBe(403);
    }
  });

  it("token de instituição nas rotas do doador: 403 (e nada do doador vaza)", async () => {
    const { token } = await criarInstituicao();
    const doador = await criarConta();
    const rotas = [
      "/doadores/me",
      `/doadores/${doador.doador.id}`,
      `/doadores/${doador.doador.id}/agendamentos`,
      `/doadores/${doador.doador.id}/formulario`,
      "/instituicoes",
      "/campanhas",
    ];
    for (const caminho of rotas) {
      const resposta = await request(app).get(caminho).set(comToken(token));
      expect(resposta.status, caminho).toBe(403);
      expect(JSON.stringify(resposta.body)).not.toContain(doador.dados.email);
    }
  });

  it("token de instituição com o id de uma conta que não existe mais devolve 401", async () => {
    const { token, conta } = await criarInstituicao();
    await prisma.contaInstituicao.delete({ where: { id: conta.id } });
    expect((await request(app).get("/instituicao/me").set(comToken(token))).status).toBe(401);
  });

  it("token antigo (sem papel) continua valendo como token de doador", async () => {
    const { doador } = await criarConta();
    const antigo = jwt.sign({}, SEGREDO_DE_TESTE, { subject: doador.id, expiresIn: "1h" });
    expect((await request(app).get("/doadores/me").set(comToken(antigo))).status).toBe(200);
    expect((await request(app).get("/instituicao/me").set(comToken(antigo))).status).toBe(403);
  });

  it("papel desconhecido no token é recusado", async () => {
    const { doador } = await criarConta();
    const estranho = jwt.sign({ papel: "administrador" }, SEGREDO_DE_TESTE, { subject: doador.id, expiresIn: "1h" });
    expect((await request(app).get("/doadores/me").set(comToken(estranho))).status).toBe(401);
  });
});

describe("pedido de inclusão no mapa", () => {
  it("a conta nova ainda não tem pedido nem instituição", async () => {
    const { token } = await criarInstituicao();
    const resposta = await request(app).get("/instituicao/me").set(comToken(token));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ solicitacao: null, instituicao: null, aprovacaoSimulada: true });
  });

  it("o pedido fica pendente e a instituição NÃO aparece no mapa dos doadores", async () => {
    const { token } = await criarInstituicao();
    const pedido = await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido({ nome: "Teste Pendente" }));
    expect(pedido.status).toBe(201);
    expect(pedido.body.solicitacao).toMatchObject({ situacao: "PENDENTE", uf: "DF", telefone: "6133274413" });
    expect(pedido.body.instituicao).toBeNull();

    const doador = await criarConta();
    const mapa = await request(app).get("/instituicoes").query({ lat: 10, lng: 10, busca: "Teste Pendente" }).set(comToken(doador.token));
    expect(mapa.body.instituicoes).toEqual([]);
  });

  it.each([
    ["nome curto", { nome: "ab" }, "nome"],
    ["endereço em branco", { endereco: "" }, "endereco"],
    ["UF com 3 letras", { uf: "DFX" }, "uf"],
    ["horário em branco", { horario: " " }, "horario"],
    ["latitude fora de -90 a 90", { latitude: 91 }, "latitude"],
    ["longitude fora de -180 a 180", { longitude: -181 }, "longitude"],
    ["latitude em texto", { latitude: "abc" }, "latitude"],
    ["telefone inválido", { telefone: "12" }, "telefone"],
  ])("recusa pedido com %s (400) e não cria nada", async (_nome, extra, campo) => {
    const { token, conta } = await criarInstituicao();
    const resposta = await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido(extra));
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[campo]).toBeTruthy();
    expect(await prisma.solicitacaoInclusao.count({ where: { contaId: conta.id } })).toBe(0);
  });

  it("um segundo pedido enquanto o primeiro está em análise dá 409", async () => {
    const { token } = await criarInstituicao();
    await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido());
    const repetido = await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido());
    expect(repetido.status).toBe(409);
  });

  it("aprovado: a instituição entra no mapa dos doadores, na ordem de distância, como instituição de verdade", async () => {
    const { instituicao } = await criarInstituicaoAprovada({}, { nome: "Teste Aprovada Alfa" });
    const doador = await criarConta();
    const mapa = await request(app).get("/instituicoes").query({ lat: 10, lng: 10 }).set(comToken(doador.token));
    const achada = mapa.body.instituicoes.find((i: { id: string }) => i.id === instituicao.id);
    expect(achada).toMatchObject({ nome: "Teste Aprovada Alfa", demonstracao: false, tiposEmFalta: [], estoqueAtualizadoEm: null });
    expect(achada.distanciaKm).toBe(0);

    const noBanco = await prisma.instituicao.findUniqueOrThrow({ where: { id: instituicao.id } });
    expect(noBanco.telefone).toBe("(61) 3327-4413");
    expect(noBanco.codigo).toMatch(/^teste-aprovada-alfa-[0-9a-f]{6}$/);
  });

  it("a decisão só vale uma vez (já aprovado: 409) e um novo pedido de quem já está no mapa dá 409", async () => {
    const { token } = await criarInstituicaoAprovada();
    const outra = await request(app).post("/instituicao/me/solicitacao/simular-decisao").set(comToken(token)).send({ decisao: "RECUSADA" });
    expect(outra.status).toBe(409);
    const novo = await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido());
    expect(novo.status).toBe(409);
  });

  it("recusado: guarda o motivo, não cria instituição e dá para pedir de novo", async () => {
    const { token } = await criarInstituicao();
    await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido({ nome: "Teste Recusada" }));
    const recusa = await request(app)
      .post("/instituicao/me/solicitacao/simular-decisao")
      .set(comToken(token))
      .send({ decisao: "RECUSADA", motivo: "Endereço não confere" });
    expect(recusa.status).toBe(200);
    expect(recusa.body.solicitacao).toMatchObject({ situacao: "RECUSADA", motivoRecusa: "Endereço não confere" });
    expect(recusa.body.instituicao).toBeNull();

    const novo = await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido({ nome: "Teste Recusada Corrigida" }));
    expect(novo.status).toBe(201);
    expect(novo.body.solicitacao).toMatchObject({ situacao: "PENDENTE", motivoRecusa: null, nome: "Teste Recusada Corrigida" });
  });

  it("decidir sem ter pedido dá 409, e uma decisão inválida dá 400", async () => {
    const { token } = await criarInstituicao();
    expect((await request(app).post("/instituicao/me/solicitacao/simular-decisao").set(comToken(token)).send({ decisao: "APROVADA" })).status).toBe(409);
    await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido());
    const invalida = await request(app).post("/instituicao/me/solicitacao/simular-decisao").set(comToken(token)).send({ decisao: "TALVEZ" });
    expect(invalida.status).toBe(400);
    expect(invalida.body.campos.decisao).toBeTruthy();
  });

  it("com APROVACAO_SIMULADA=false a simulação é desligada: 403 e o painel avisa que não há botões de demonstração", async () => {
    const { token } = await criarInstituicao();
    await request(app).post("/instituicao/me/solicitacao").set(comToken(token)).send(pedidoValido());
    env.aprovacaoSimulada = false;
    try {
      const resposta = await request(app).post("/instituicao/me/solicitacao/simular-decisao").set(comToken(token)).send({ decisao: "APROVADA" });
      expect(resposta.status).toBe(403);
      expect((await request(app).get("/instituicao/me").set(comToken(token))).body).toMatchObject({ aprovacaoSimulada: false, solicitacao: { situacao: "PENDENTE" } });
    } finally {
      env.aprovacaoSimulada = true;
    }
  });

  it("uma instituição nunca vê nem decide o pedido de outra (o dono vem do token)", async () => {
    const a = await criarInstituicao();
    const b = await criarInstituicao();
    await request(app).post("/instituicao/me/solicitacao").set(comToken(a.token)).send(pedidoValido({ nome: "Teste Pedido da A" }));

    const vistaPelaB = await request(app).get("/instituicao/me").set(comToken(b.token));
    expect(vistaPelaB.body.solicitacao).toBeNull();
    expect(JSON.stringify(vistaPelaB.body)).not.toContain("Pedido da A");
    // A decisão da B não mexe no pedido da A.
    expect((await request(app).post("/instituicao/me/solicitacao/simular-decisao").set(comToken(b.token)).send({ decisao: "APROVADA" })).status).toBe(409);
    expect((await prisma.solicitacaoInclusao.findUniqueOrThrow({ where: { contaId: a.conta.id } })).situacao).toBe("PENDENTE");
  });
});

describe("estoque e dados da instituição aprovada", () => {
  it("antes de aprovada: 409 em dados, estoque e campanhas", async () => {
    const { token } = await criarInstituicao();
    expect((await request(app).patch("/instituicao/me/estoque").set(comToken(token)).send({ tiposEmFalta: ["O-"] })).status).toBe(409);
    expect((await request(app).patch("/instituicao/me/dados").set(comToken(token)).send({ horario: "24 horas" })).status).toBe(409);
    expect((await request(app).get("/instituicao/me/campanhas").set(comToken(token))).status).toBe(409);
    expect((await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida())).status).toBe(409);
  });

  it("os tipos em falta aparecem no mapa dos doadores, com a data de hoje", async () => {
    const { token, instituicao } = await criarInstituicaoAprovada({}, { nome: "Teste Estoque" });
    const resposta = await request(app).patch("/instituicao/me/estoque").set(comToken(token)).send({ tiposEmFalta: ["o-", "A+", "O-"] });
    expect(resposta.status).toBe(200);
    expect(resposta.body.instituicao.tiposEmFalta.sort()).toEqual(["A+", "O-"]);
    expect(resposta.body.instituicao.estoqueAtualizadoEm).not.toBeNull();

    const doador = await criarConta();
    const detalhe = await request(app).get(`/instituicoes/${instituicao.id}`).set(comToken(doador.token));
    expect(detalhe.body.instituicao.tiposEmFalta.sort()).toEqual(["A+", "O-"]);
  });

  it("lista vazia significa nenhum em falta (e o estoque passa a estar informado)", async () => {
    const { token } = await criarInstituicaoAprovada();
    await request(app).patch("/instituicao/me/estoque").set(comToken(token)).send({ tiposEmFalta: ["B+"] });
    const resposta = await request(app).patch("/instituicao/me/estoque").set(comToken(token)).send({ tiposEmFalta: [] });
    expect(resposta.status).toBe(200);
    expect(resposta.body.instituicao.tiposEmFalta).toEqual([]);
    expect(resposta.body.instituicao.estoqueAtualizadoEm).not.toBeNull();
  });

  it.each([[{ tiposEmFalta: ["Z+"] }], [{ tiposEmFalta: "O-" }], [{}]])("estoque inválido %j dá 400", async (corpo) => {
    const { token } = await criarInstituicaoAprovada();
    const resposta = await request(app).patch("/instituicao/me/estoque").set(comToken(token)).send(corpo);
    expect(resposta.status).toBe(400);
  });

  it("altera telefone e horário; telefone vazio apaga; sem nada para alterar dá 400", async () => {
    const { token } = await criarInstituicaoAprovada();
    const mudou = await request(app).patch("/instituicao/me/dados").set(comToken(token)).send({ horario: "24 horas", telefone: "(61) 99999-8888" });
    expect(mudou.status).toBe(200);
    expect(mudou.body.instituicao).toMatchObject({ horario: "24 horas", telefone: "(61) 99999-8888" });

    const apagou = await request(app).patch("/instituicao/me/dados").set(comToken(token)).send({ telefone: "" });
    expect(apagou.body.instituicao.telefone).toBeNull();
    expect(apagou.body.instituicao.horario).toBe("24 horas");

    expect((await request(app).patch("/instituicao/me/dados").set(comToken(token)).send({})).status).toBe(400);
    expect((await request(app).patch("/instituicao/me/dados").set(comToken(token)).send({ telefone: "12" })).status).toBe(400);
  });

  it("uma instituição só altera o estoque da própria instituição", async () => {
    const a = await criarInstituicaoAprovada({}, { nome: "Teste Estoque A" });
    const b = await criarInstituicaoAprovada({}, { nome: "Teste Estoque B" });
    await request(app).patch("/instituicao/me/estoque").set(comToken(b.token)).send({ tiposEmFalta: ["AB-"] });
    expect((await prisma.instituicao.findUniqueOrThrow({ where: { id: a.instituicao.id } })).tiposEmFalta).toEqual([]);
  });
});

describe("campanhas relâmpago", () => {
  it("cria, lista e mostra a situação; o doador vê só campanhas ativas", async () => {
    const { token } = await criarInstituicaoAprovada({}, { nome: "Teste Campanhas" });
    const criada = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ tiposSanguineos: ["o-", "A+"] }));
    expect(criada.status).toBe(201);
    expect(criada.body.campanha).toMatchObject({ titulo: "Falta O negativo", situacao: "ATIVA", encerradaEm: null, validaAte: emDias(5) });
    expect(criada.body.campanha.tiposSanguineos.sort()).toEqual(["A+", "O-"]);

    const lista = await request(app).get("/instituicao/me/campanhas").set(comToken(token));
    expect(lista.body.total).toBe(1);
    expect(lista.body.campanhas[0].id).toBe(criada.body.campanha.id);

    const doador = await criarConta();
    const vista = await request(app).get("/campanhas").query({ lat: 10, lng: 10 }).set(comToken(doador.token));
    expect(vista.status).toBe(200);
    const nossa = vista.body.campanhas.find((c: { id: string }) => c.id === criada.body.campanha.id);
    expect(nossa).toMatchObject({ titulo: "Falta O negativo", instituicao: { nome: "Teste Campanhas", distanciaKm: 0 } });
  });

  it("sem tipos informados, a campanha vale para todos os tipos", async () => {
    const { token } = await criarInstituicaoAprovada();
    const criada = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ tiposSanguineos: undefined }));
    expect(criada.status).toBe(201);
    expect(criada.body.campanha.tiposSanguineos).toEqual([]);
  });

  it.each([
    ["título curto", { titulo: "ab" }, "titulo"],
    ["descrição curta", { descricao: "curta" }, "descricao"],
    ["tipo sanguíneo inexistente", { tiposSanguineos: ["Z+"] }, "tiposSanguineos"],
    ["data que não existe", { validaAte: "2026-02-31" }, "validaAte"],
    ["data em outro formato", { validaAte: "31/12/2026" }, "validaAte"],
    ["data de ontem", { validaAte: emDias(-1) }, "validaAte"],
    ["data a mais de 180 dias", { validaAte: emDias(200) }, "validaAte"],
    ["data em branco", { validaAte: "" }, "validaAte"],
  ])("recusa campanha com %s (400) e não grava nada", async (_nome, extra, campo) => {
    const { token } = await criarInstituicaoAprovada();
    const resposta = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida(extra));
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[campo]).toBeTruthy();
    expect((await request(app).get("/instituicao/me/campanhas").set(comToken(token))).body.total).toBe(0);
  });

  it("valores-limite: a campanha pode terminar hoje e pode durar até 180 dias", async () => {
    const { token } = await criarInstituicaoAprovada();
    const hoje = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ validaAte: emDias(0) }));
    expect(hoje.status).toBe(201);
    const limite = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ validaAte: emDias(180) }));
    expect(limite.status).toBe(201);
  });

  it("altera título, descrição, tipos e data; sem nada para alterar dá 400", async () => {
    const { token } = await criarInstituicaoAprovada();
    const { body } = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida());
    const id = body.campanha.id;
    const mudou = await request(app)
      .patch(`/instituicao/me/campanhas/${id}`)
      .set(comToken(token))
      .send({ titulo: "Novo título", tiposSanguineos: [], validaAte: emDias(10) });
    expect(mudou.status).toBe(200);
    expect(mudou.body.campanha).toMatchObject({ titulo: "Novo título", tiposSanguineos: [], validaAte: emDias(10) });
    expect(mudou.body.campanha.descricao).toBe(campanhaValida().descricao);

    expect((await request(app).patch(`/instituicao/me/campanhas/${id}`).set(comToken(token)).send({})).status).toBe(400);
    expect((await request(app).patch(`/instituicao/me/campanhas/${id}`).set(comToken(token)).send({ validaAte: emDias(-3) })).status).toBe(400);
  });

  it("encerrada: some para o doador, continua na lista da instituição e não pode mais ser alterada nem encerrada de novo", async () => {
    const { token } = await criarInstituicaoAprovada();
    const { body } = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ titulo: "Campanha para encerrar" }));
    const id = body.campanha.id;
    const doador = await criarConta();
    const antes = await request(app).get("/campanhas").set(comToken(doador.token));
    expect(antes.body.campanhas.some((c: { id: string }) => c.id === id)).toBe(true);

    const encerrada = await request(app).post(`/instituicao/me/campanhas/${id}/encerrar`).set(comToken(token));
    expect(encerrada.status).toBe(200);
    expect(encerrada.body.campanha).toMatchObject({ situacao: "ENCERRADA" });
    expect(encerrada.body.campanha.encerradaEm).not.toBeNull();

    const depois = await request(app).get("/campanhas").set(comToken(doador.token));
    expect(depois.body.campanhas.some((c: { id: string }) => c.id === id)).toBe(false);
    expect((await request(app).get("/instituicao/me/campanhas").set(comToken(token))).body.campanhas[0].situacao).toBe("ENCERRADA");
    expect((await request(app).post(`/instituicao/me/campanhas/${id}/encerrar`).set(comToken(token))).status).toBe(409);
    expect((await request(app).patch(`/instituicao/me/campanhas/${id}`).set(comToken(token)).send({ titulo: "Outro título" })).status).toBe(409);
  });

  it("passou da data final: vira VENCIDA e some para o doador (o tempo anda no relógio do sistema)", async () => {
    const { token } = await criarInstituicaoAprovada();
    const { body } = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ validaAte: amanha() }));
    const id = body.campanha.id;
    const doador = await criarConta();

    definirRelogio(() => new Date(Date.now() + 3 * 86_400_000));
    expect((await request(app).get("/instituicao/me/campanhas").set(comToken(token))).body.campanhas[0].situacao).toBe("VENCIDA");
    const vista = await request(app).get("/campanhas").set(comToken(doador.token));
    expect(vista.body.campanhas.some((c: { id: string }) => c.id === id)).toBe(false);
  });

  it("exclui a campanha (204) e ela deixa de existir (404 ao excluir de novo)", async () => {
    const { token } = await criarInstituicaoAprovada();
    const { body } = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida());
    expect((await request(app).delete(`/instituicao/me/campanhas/${body.campanha.id}`).set(comToken(token))).status).toBe(204);
    expect((await request(app).delete(`/instituicao/me/campanhas/${body.campanha.id}`).set(comToken(token))).status).toBe(404);
    expect(await prisma.campanha.count({ where: { id: body.campanha.id } })).toBe(0);
  });

  it("id de campanha que não existe devolve 404", async () => {
    const { token } = await criarInstituicaoAprovada();
    const falso = "00000000-0000-4000-8000-000000000000";
    expect((await request(app).patch(`/instituicao/me/campanhas/${falso}`).set(comToken(token)).send({ titulo: "Qualquer" })).status).toBe(404);
    expect((await request(app).post(`/instituicao/me/campanhas/${falso}/encerrar`).set(comToken(token))).status).toBe(404);
    expect((await request(app).patch("/instituicao/me/campanhas/nao-e-um-id").set(comToken(token)).send({ titulo: "Qualquer" })).status).toBe(404);
  });

  it("uma instituição não vê, altera, encerra nem exclui a campanha de outra (404, e nada muda)", async () => {
    const a = await criarInstituicaoAprovada({}, { nome: "Teste Dona da Campanha" });
    const b = await criarInstituicaoAprovada({}, { nome: "Teste Intrusa" });
    const { body } = await request(app).post("/instituicao/me/campanhas").set(comToken(a.token)).send(campanhaValida({ titulo: "Campanha da A" }));
    const id = body.campanha.id;

    const listaDaB = await request(app).get("/instituicao/me/campanhas").set(comToken(b.token));
    expect(listaDaB.body.total).toBe(0);
    expect(JSON.stringify(listaDaB.body)).not.toContain("Campanha da A");
    expect((await request(app).patch(`/instituicao/me/campanhas/${id}`).set(comToken(b.token)).send({ titulo: "Roubada" })).status).toBe(404);
    expect((await request(app).post(`/instituicao/me/campanhas/${id}/encerrar`).set(comToken(b.token))).status).toBe(404);
    expect((await request(app).delete(`/instituicao/me/campanhas/${id}`).set(comToken(b.token))).status).toBe(404);

    const noBanco = await prisma.campanha.findUniqueOrThrow({ where: { id } });
    expect(noBanco).toMatchObject({ titulo: "Campanha da A", encerradaEm: null });
  });

  it("no máximo 20 campanhas ativas por instituição (a 21ª dá 409; encerrar uma libera vaga)", async () => {
    const { token } = await criarInstituicaoAprovada();
    let primeira = "";
    for (let i = 0; i < 20; i++) {
      const r = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ titulo: `Campanha ${i}` }));
      expect(r.status).toBe(201);
      primeira ||= r.body.campanha.id;
    }
    expect((await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida())).status).toBe(409);
    await request(app).post(`/instituicao/me/campanhas/${primeira}/encerrar`).set(comToken(token));
    expect((await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida())).status).toBe(201);
  });

  it("para o doador: as campanhas do tipo dele vêm primeiro e a distância aparece quando ele informa onde está", async () => {
    const { token } = await criarInstituicaoAprovada({}, { nome: "Teste Ordem" });
    const paraAB = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ titulo: "So AB", tiposSanguineos: ["AB-"], validaAte: emDias(2) }));
    const paraTodos = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ titulo: "Todos", tiposSanguineos: [], validaAte: emDias(9) }));
    const paraO = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida({ titulo: "So O", tiposSanguineos: ["O-"], validaAte: emDias(7) }));

    const doador = await criarConta();
    await request(app).patch("/doadores/me").set(comToken(doador.token)).send({ tipoSanguineo: "O-" });
    const vista = await request(app).get("/campanhas").query({ lat: 10, lng: 10 }).set(comToken(doador.token));
    const nossas = vista.body.campanhas.filter((c: { instituicao: { nome: string } }) => c.instituicao.nome === "Teste Ordem");
    expect(nossas.map((c: { titulo: string }) => c.titulo)).toEqual(["So O", "Todos", "So AB"]);
    expect(nossas.map((c: { paraMeuTipo: boolean }) => c.paraMeuTipo)).toEqual([true, true, false]);
    expect(nossas[0].instituicao.distanciaKm).toBe(0);
    expect([paraAB, paraTodos, paraO].every((r) => r.status === 201)).toBe(true);

    const semLocal = await request(app).get("/campanhas").set(comToken(doador.token));
    expect(semLocal.body.campanhas.find((c: { titulo: string }) => c.titulo === "So O").instituicao.distanciaKm).toBeNull();
  });

  it("GET /campanhas: sem token 401, só latitude 400, latitude inválida 400", async () => {
    expect((await request(app).get("/campanhas")).status).toBe(401);
    const { token } = await criarConta();
    expect((await request(app).get("/campanhas").query({ lat: 10 }).set(comToken(token))).status).toBe(400);
    expect((await request(app).get("/campanhas").query({ lat: 99, lng: 10 }).set(comToken(token))).status).toBe(400);
  });
});

describe("excluir a conta da instituição", () => {
  it("apaga a conta, a instituição do mapa e as campanhas; o token deixa de valer", async () => {
    const { token, conta, instituicao } = await criarInstituicaoAprovada({}, { nome: "Teste Para Excluir" });
    const { body } = await request(app).post("/instituicao/me/campanhas").set(comToken(token)).send(campanhaValida());

    expect((await request(app).delete("/instituicao/me").set(comToken(token))).status).toBe(204);
    expect(await prisma.contaInstituicao.count({ where: { id: conta.id } })).toBe(0);
    expect(await prisma.instituicao.count({ where: { id: instituicao.id } })).toBe(0);
    expect(await prisma.campanha.count({ where: { id: body.campanha.id } })).toBe(0);
    expect((await request(app).get("/instituicao/me").set(comToken(token))).status).toBe(401);
  });

  it("excluir uma instituição não mexe na de outra", async () => {
    const a = await criarInstituicaoAprovada({}, { nome: "Teste Fica" });
    const b = await criarInstituicaoAprovada({}, { nome: "Teste Sai" });
    await request(app).delete("/instituicao/me").set(comToken(b.token));
    expect(await prisma.instituicao.count({ where: { id: a.instituicao.id } })).toBe(1);
    expect((await request(app).get("/instituicao/me").set(comToken(a.token))).status).toBe(200);
  });
});

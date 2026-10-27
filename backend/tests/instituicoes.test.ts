import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TipoSanguineo } from "../generated/prisma/enums";
import { prisma } from "../src/db";
import { KM_POR_GRAU_DE_LATITUDE, distanciaKm } from "../src/utils/distancia";
import { app, comToken, criarConta, limpar } from "./helpers";

// HU-05 / RNF-008 / RN07: lista de instituições próximas (raio, ordem por distância, busca por nome).
// As instituições de teste ficam num ponto longe do Brasil (10°N, 10°L), então nunca se misturam com as reais.

const ORIGEM = { latitude: 10, longitude: 10 };
const aoNorte = (km: number) => ({ latitude: ORIGEM.latitude + km / KM_POR_GRAU_DE_LATITUDE, longitude: ORIGEM.longitude });

const base = { endereco: "Rua de Teste, 1", cidade: "Cidade de Teste", uf: "DF", horario: "Segunda a sexta, das 8h às 17h", demonstracao: true };
const fixtures = [
  { codigo: "teste-alfa", nome: "Teste Alfa", ...aoNorte(4.999) },
  { codigo: "teste-bravo", nome: "Teste Bravo", ...aoNorte(2), telefone: "(61) 3000-0000", tiposEmFalta: [TipoSanguineo.O_NEGATIVO, TipoSanguineo.AB_POSITIVO], estoqueAtualizadoEm: new Date("2026-10-20T00:00:00.000Z") },
  { codigo: "teste-charlie", nome: "Teste Charlie", ...aoNorte(5.001) },
  { codigo: "teste-delta", nome: "Teste Delta", ...aoNorte(19.9) },
  { codigo: "teste-eco", nome: "Teste Hemocentro São João", ...aoNorte(30) },
  { codigo: "teste-foxtrot", nome: "Teste Foxtrot", ...aoNorte(150) },
];

const apagarFixtures = () => prisma.instituicao.deleteMany({ where: { codigo: { startsWith: "teste-" } } });

let token: string;
const consulta = (parametros: Record<string, string | number> = {}) =>
  request(app).get("/instituicoes").query(parametros).set(comToken(token));
const nomes = (corpo: { instituicoes: Array<{ nome: string }> }) => corpo.instituicoes.map((i) => i.nome);
const soDeTeste = (corpo: { instituicoes: Array<{ nome: string }> }) => nomes(corpo).filter((n) => n.startsWith("Teste "));
const ondeEstou = { lat: ORIGEM.latitude, lng: ORIGEM.longitude };

beforeAll(async () => {
  await limpar();
  await apagarFixtures();
  await prisma.instituicao.createMany({ data: fixtures.map((f) => ({ tiposEmFalta: [], ...base, ...f })) });
  token = (await criarConta()).token;
});
afterAll(async () => {
  await apagarFixtures();
  await limpar();
  await prisma.$disconnect();
});

describe("as rotas de instituições exigem login (RN-011)", () => {
  it("sem token, devolvem 401", async () => {
    expect((await request(app).get("/instituicoes")).status).toBe(401);
    expect((await request(app).get("/instituicoes/qualquer-id")).status).toBe(401);
  });

  it("com token inválido, devolvem 401", async () => {
    expect((await request(app).get("/instituicoes").set(comToken("token-falso"))).status).toBe(401);
  });
});

describe("os pontos de teste ficam mesmo onde dizem (base dos testes de raio)", () => {
  it("as distâncias até a origem batem com o combinado", () => {
    expect(distanciaKm(ORIGEM, aoNorte(4.999))).toBeCloseTo(4.999, 6);
    expect(distanciaKm(ORIGEM, aoNorte(5.001))).toBeCloseTo(5.001, 6);
  });
});

describe("GET /instituicoes com a localização da pessoa (cenário 1 e 4)", () => {
  it("raio de 5 km: traz só as que estão dentro, da mais perto para a mais longe", async () => {
    const resposta = await consulta({ ...ondeEstou, raioKm: 5 });

    expect(resposta.status).toBe(200);
    // A ordem é por distância (Bravo a 2 km, Alfa a 4,999 km), não por nome.
    expect(nomes(resposta.body)).toEqual(["Teste Bravo", "Teste Alfa"]);
    expect(resposta.body.instituicoes.map((i: { distanciaKm: number }) => i.distanciaKm)).toEqual([2, 5]);
    expect(resposta.body).toMatchObject({ total: 2, raioKm: 5 });
  });

  it("4,999 km entra no raio de 5 km e 5,001 km fica de fora (valores-limite)", async () => {
    const dentro = nomes((await consulta({ ...ondeEstou, raioKm: 5 })).body);
    expect(dentro).toContain("Teste Alfa");
    expect(dentro).not.toContain("Teste Charlie");
  });

  it("aumentar o raio para 20 km mostra as outras (cenário 4): 19,9 km entra, 30 km não", async () => {
    const resposta = await consulta({ ...ondeEstou, raioKm: 20 });

    expect(nomes(resposta.body)).toEqual(["Teste Bravo", "Teste Alfa", "Teste Charlie", "Teste Delta"]);
    expect(resposta.body.instituicoes.map((i: { distanciaKm: number }) => i.distanciaKm)).toEqual([2, 5, 5, 19.9]);
    expect(resposta.body.raioKm).toBe(20);
  });

  it("sem informar o raio, vale o padrão de 20 km", async () => {
    const resposta = await consulta(ondeEstou);

    expect(nomes(resposta.body)).toEqual(["Teste Bravo", "Teste Alfa", "Teste Charlie", "Teste Delta"]);
    expect(resposta.body.raioKm).toBe(20);
  });

  it("raio de 100 km (o máximo) ainda deixa de fora quem está a 150 km", async () => {
    const resposta = await consulta({ ...ondeEstou, raioKm: 100 });

    expect(nomes(resposta.body)).toContain("Teste Hemocentro São João");
    expect(nomes(resposta.body)).not.toContain("Teste Foxtrot");
  });

  it("nenhuma instituição no raio: lista vazia, sem erro", async () => {
    const resposta = await consulta({ lat: 40, lng: 40, raioKm: 5 });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ instituicoes: [], raioKm: 5, total: 0 });
  });

  it("cada instituição traz o que o card e os detalhes precisam, em formato de app", async () => {
    const resposta = await consulta({ ...ondeEstou, raioKm: 5 });
    const bravo = resposta.body.instituicoes.find((i: { nome: string }) => i.nome === "Teste Bravo");

    expect(bravo).toMatchObject({
      nome: "Teste Bravo",
      endereco: "Rua de Teste, 1",
      cidade: "Cidade de Teste",
      uf: "DF",
      telefone: "(61) 3000-0000",
      horario: "Segunda a sexta, das 8h às 17h",
      tiposEmFalta: ["O-", "AB+"],
      estoqueAtualizadoEm: "2026-10-20T00:00:00.000Z",
      demonstracao: true,
      distanciaKm: 2,
    });
    expect(typeof bravo.id).toBe("string");
    expect(bravo.latitude).toBeCloseTo(aoNorte(2).latitude, 9);
    expect(bravo.longitude).toBe(10);
    // Dados internos não vão para o app.
    expect(bravo).not.toHaveProperty("codigo");
    expect(bravo).not.toHaveProperty("fonte");
  });
});

describe("busca por nome (cenário 3)", () => {
  it("acha pelo nome, sem se importar com acento ou maiúsculas", async () => {
    expect(nomes((await consulta({ busca: "sao joao" })).body)).toEqual(["Teste Hemocentro São João"]);
    expect(nomes((await consulta({ busca: "HEMOCENTRO SÃO" })).body)).toEqual(["Teste Hemocentro São João"]);
    expect(soDeTeste((await consulta({ busca: "alfa" })).body)).toEqual(["Teste Alfa"]);
  });

  it("acha por parte do nome e também pela cidade", async () => {
    expect(soDeTeste((await consulta({ busca: "ravo" })).body)).toEqual(["Teste Bravo"]);
    expect(soDeTeste((await consulta({ busca: "cidade de teste" })).body)).toHaveLength(fixtures.length);
  });

  it("com busca, o raio não vale: acha a instituição mesmo a 30 km (e a 150 km)", async () => {
    const resposta = await consulta({ ...ondeEstou, raioKm: 5, busca: "teste" });

    expect(soDeTeste(resposta.body)).toEqual([
      "Teste Bravo",
      "Teste Alfa",
      "Teste Charlie",
      "Teste Delta",
      "Teste Hemocentro São João",
      "Teste Foxtrot",
    ]);
    expect(resposta.body.raioKm).toBeNull();
  });

  it("com busca e localização, os resultados trazem a distância e vêm do mais perto para o mais longe", async () => {
    const resposta = await consulta({ ...ondeEstou, busca: "teste" });
    const distancias = resposta.body.instituicoes
      .filter((i: { nome: string }) => i.nome.startsWith("Teste "))
      .map((i: { distanciaKm: number }) => i.distanciaKm);

    expect(distancias).toEqual([2, 5, 5, 19.9, 30, 150]);
  });

  it("busca sem resultado: lista vazia", async () => {
    const resposta = await consulta({ busca: "nome que nao existe xyz" });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ instituicoes: [], raioKm: null, total: 0 });
  });

  it("busca em branco conta como sem busca", async () => {
    const resposta = await consulta({ ...ondeEstou, raioKm: 5, busca: "   " });

    expect(nomes(resposta.body)).toEqual(["Teste Bravo", "Teste Alfa"]);
  });
});

describe("sem localização (permissão negada ou GPS desligado: cenário 5 da HU-05 e RNF-008)", () => {
  it("lista todas, em ordem de nome e sem distância, para a busca manual funcionar", async () => {
    const resposta = await consulta();

    expect(resposta.status).toBe(200);
    expect(resposta.body.raioKm).toBeNull();
    expect(resposta.body.total).toBe(resposta.body.instituicoes.length);
    expect(resposta.body.instituicoes.length).toBeGreaterThanOrEqual(fixtures.length);
    for (const i of resposta.body.instituicoes) expect(i.distanciaKm).toBeNull();

    const todos = nomes(resposta.body);
    expect(todos).toEqual([...todos].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });

  it("a busca manual acha a instituição pelo nome", async () => {
    const resposta = await consulta({ busca: "foxtrot" });

    expect(nomes(resposta.body)).toEqual(["Teste Foxtrot"]);
    expect(resposta.body.instituicoes[0].distanciaKm).toBeNull();
  });
});

describe("parâmetros inválidos devolvem 400 com a mensagem do campo", () => {
  it.each([
    [{ lat: 10 }, "lat", "Informe latitude e longitude juntas."],
    [{ lng: 10 }, "lat", "Informe latitude e longitude juntas."],
    [{ lat: "abc", lng: 10 }, "lat", "A latitude deve ser um número entre -90 e 90."],
    [{ lat: 91, lng: 10 }, "lat", "A latitude deve ser um número entre -90 e 90."],
    [{ lat: 10, lng: 181 }, "lng", "A longitude deve ser um número entre -180 e 180."],
    [{ lat: 10, lng: 10, raioKm: 0 }, "raioKm", "O raio de busca deve ser um número entre 1 e 100 km."],
    [{ lat: 10, lng: 10, raioKm: 101 }, "raioKm", "O raio de busca deve ser um número entre 1 e 100 km."],
    [{ lat: 10, lng: 10, raioKm: "muito" }, "raioKm", "O raio de busca deve ser um número entre 1 e 100 km."],
    [{ busca: "x".repeat(81) }, "busca", "A busca deve ter no máximo 80 caracteres."],
  ])("%j", async (parametros, campo, mensagem) => {
    const resposta = await consulta(parametros);

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem).toBe("Dados inválidos.");
    expect(resposta.body.campos[campo]).toBe(mensagem);
  });

  it("valores limite válidos passam: raio 1 e 100, latitude -90 e 90, longitude -180 e 180", async () => {
    const limites: Array<Record<string, number>> = [
      { lat: 10, lng: 10, raioKm: 1 },
      { lat: 10, lng: 10, raioKm: 100 },
      { lat: -90, lng: -180 },
      { lat: 90, lng: 180 },
    ];
    for (const parametros of limites) {
      expect((await consulta(parametros)).status, JSON.stringify(parametros)).toBe(200);
    }
  });

  it("parâmetros vazios contam como não informados", async () => {
    const resposta = await consulta({ lat: "", lng: "", raioKm: "", busca: "" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.raioKm).toBeNull();
  });
});

describe("GET /instituicoes/:id (cenário 2, sem agendamento)", () => {
  it("devolve os detalhes: nome, endereço, telefone, horário e tipos em falta", async () => {
    const lista = await consulta({ busca: "Teste Bravo" });
    const id = lista.body.instituicoes[0].id;

    const resposta = await request(app).get(`/instituicoes/${id}`).set(comToken(token));

    expect(resposta.status).toBe(200);
    expect(resposta.body.instituicao).toMatchObject({
      id,
      nome: "Teste Bravo",
      endereco: "Rua de Teste, 1",
      telefone: "(61) 3000-0000",
      horario: "Segunda a sexta, das 8h às 17h",
      tiposEmFalta: ["O-", "AB+"],
      distanciaKm: null,
    });
  });

  it("id que não existe devolve 404 com mensagem", async () => {
    for (const id of ["00000000-0000-4000-8000-000000000000", "nao-existe"]) {
      const resposta = await request(app).get(`/instituicoes/${id}`).set(comToken(token));
      expect(resposta.status, id).toBe(404);
      expect(resposta.body).toEqual({ mensagem: "Instituição não encontrada." });
    }
  });
});

import request from "supertest";
import { describe, expect, it } from "vitest";
import { criarApp } from "../src/app";

// A versão web do aplicativo fica em outro endereço da internet, então o navegador só deixa ela
// falar com a API se a API disser que aquele endereço é permitido (CORS).

const SITE = "https://vitta-app-ucb.onrender.com";
const OUTRO_SITE = "https://site-de-outra-pessoa.example";

describe("sem configuração (o padrão)", () => {
  const app = criarApp({ origensPermitidas: [] });

  it("não libera nenhum site", async () => {
    const resposta = await request(app).get("/health").set("Origin", SITE);

    expect(resposta.status).toBe(200);
    expect(resposta.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("o pedido de verificação do navegador (preflight) não é respondido como liberado", async () => {
    const resposta = await request(app).options("/auth/login").set("Origin", SITE).set("Access-Control-Request-Method", "POST");

    expect(resposta.headers["access-control-allow-origin"]).toBeUndefined();
    expect(resposta.status).not.toBe(204);
  });
});

describe("liberando um site específico", () => {
  const app = criarApp({ origensPermitidas: [SITE] });

  it("o site liberado recebe a permissão com o próprio endereço", async () => {
    const resposta = await request(app).get("/health").set("Origin", SITE);

    expect(resposta.status).toBe(200);
    expect(resposta.headers["access-control-allow-origin"]).toBe(SITE);
    expect(resposta.headers["vary"]).toContain("Origin");
  });

  it("outro site não recebe permissão", async () => {
    const resposta = await request(app).get("/health").set("Origin", OUTRO_SITE);

    expect(resposta.status).toBe(200);
    expect(resposta.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("o preflight do site liberado devolve 204 com os cabeçalhos e métodos que o app usa", async () => {
    const resposta = await request(app)
      .options("/doadores/me")
      .set("Origin", SITE)
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "authorization,content-type");

    expect(resposta.status).toBe(204);
    expect(resposta.headers["access-control-allow-origin"]).toBe(SITE);
    expect(resposta.headers["access-control-allow-headers"]).toMatch(/authorization/i);
    expect(resposta.headers["access-control-allow-headers"]).toMatch(/content-type/i);
    for (const metodo of ["GET", "POST", "PATCH", "DELETE"]) expect(resposta.headers["access-control-allow-methods"]).toContain(metodo);
  });

  it("o preflight de outro site não é liberado", async () => {
    const resposta = await request(app).options("/doadores/me").set("Origin", OUTRO_SITE).set("Access-Control-Request-Method", "PATCH");

    expect(resposta.headers["access-control-allow-origin"]).toBeUndefined();
    expect(resposta.status).not.toBe(204);
  });

  it("as respostas de erro também levam a permissão (senão o navegador esconderia a mensagem de erro do app)", async () => {
    const semLogin = await request(app).get("/instituicoes").set("Origin", SITE);
    const rotaInexistente = await request(app).get("/nao-existe").set("Origin", SITE);

    expect(semLogin.status).toBe(401);
    expect(semLogin.headers["access-control-allow-origin"]).toBe(SITE);
    expect(rotaInexistente.status).toBe(404);
    expect(rotaInexistente.headers["access-control-allow-origin"]).toBe(SITE);
  });

  it("o aplicativo do celular (que não manda Origin) segue funcionando igual", async () => {
    const resposta = await request(app).get("/health");

    expect(resposta.status).toBe(200);
    expect(resposta.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("liberando todos os sites com *", () => {
  const app = criarApp({ origensPermitidas: ["*"] });

  it("qualquer site recebe a permissão geral, sem cookies envolvidos", async () => {
    const resposta = await request(app).get("/health").set("Origin", OUTRO_SITE);

    expect(resposta.headers["access-control-allow-origin"]).toBe("*");
    expect(resposta.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("o preflight devolve 204", async () => {
    const resposta = await request(app).options("/auth/login").set("Origin", OUTRO_SITE).set("Access-Control-Request-Method", "POST");

    expect(resposta.status).toBe(204);
    expect(resposta.headers["access-control-allow-origin"]).toBe("*");
  });
});

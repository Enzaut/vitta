import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { MSG_FORMULARIO_VENCIDO } from "../src/triagem/agendamento";
import { definirRelogio } from "../src/utils/relogio";
import { app, comToken, criarConta, limpar } from "./helpers";
import { respostasLimpas } from "./respostas";

// HU-03 / E2-2: as rotas do formulário de análise (resposta, resultado, validade e bloqueio do agendamento).
// O relógio é fixado em 19/10/2026 (meio-dia em Brasília) e depois "anda" para testar a data de retorno e a validade.

const agoraEm = (iso: string) => definirRelogio(() => new Date(iso));
const HOJE = "2026-10-19T15:00:00Z";
const diaDepois = (dias: number) => new Date(Date.parse("2026-10-19T15:00:00Z") + dias * 86_400_000).toISOString();

const enviar = (token: string, respostas: unknown, id = "me") =>
  request(app).post(`/doadores/${id}/formulario`).set(comToken(token)).send({ respostas });
const obter = (token: string, id = "me") => request(app).get(`/doadores/${id}/formulario`).set(comToken(token));

beforeAll(limpar);
beforeEach(() => agoraEm(HOJE));
afterEach(async () => {
  definirRelogio(null);
  await limpar();
});
afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("as rotas do formulário exigem login", () => {
  it("sem token, devolvem 401", async () => {
    expect((await request(app).get("/doadores/me/formulario/modelo")).status).toBe(401);
    expect((await request(app).get("/doadores/me/formulario")).status).toBe(401);
    expect((await request(app).post("/doadores/me/formulario").send({ respostas: respostasLimpas() })).status).toBe(401);
  });
});

describe("GET /doadores/me/formulario/modelo", () => {
  it("devolve as perguntas, a versão das regras e a validade", async () => {
    const { token } = await criarConta();

    const resposta = await request(app).get("/doadores/me/formulario/modelo").set(comToken(token));

    expect(resposta.status).toBe(200);
    expect(resposta.body.modelo.versaoRegras).toBe("2026-09-30");
    expect(resposta.body.modelo.validadeDias).toBe(30);
    expect(resposta.body.modelo.blocos).toHaveLength(10);
    expect(resposta.body.modelo.blocos[0]).toMatchObject({ id: "hoje", titulo: "Como você está hoje" });
    // As regras (prazos) não vão para o app.
    expect(JSON.stringify(resposta.body)).not.toContain("prazo");
  });
});

describe("GET /doadores/me/formulario", () => {
  it("antes de responder, devolve formulario nulo", async () => {
    const { token } = await criarConta();

    const resposta = await obter(token);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ formulario: null });
  });
});

describe("cenário 1: formulário respondido, doador apto", () => {
  it("responde 201, registra data e validade e libera o agendamento", async () => {
    const { token, doador } = await criarConta();

    const resposta = await enviar(token, respostasLimpas());

    expect(resposta.status).toBe(201);
    const f = resposta.body.formulario;
    expect(f).toMatchObject({
      resultado: "APTO",
      liberadoEm: null,
      motivos: [],
      versaoRegras: "2026-09-30",
      preenchidoEm: "2026-10-19T15:00:00.000Z",
      validoAte: "2026-11-18", // 30 dias depois do preenchimento
      vencido: false,
      agendamentoLiberado: true,
      bloqueioAgendamento: null,
    });
    expect(f.mensagem).toContain("Pelas suas respostas, você pode agendar a sua doação");
    expect(f.mensagem).toContain("A decisão final é da triagem no hemocentro");
    // As respostas não voltam na resposta da API.
    expect(f).not.toHaveProperty("respostas");

    // O que ficou no banco (evidência da matriz: data do preenchimento e validade).
    const linha = await prisma.formularioElegibilidade.findUniqueOrThrow({ where: { doadorId: doador.id } });
    expect(linha.preenchidoEm.toISOString()).toBe("2026-10-19T15:00:00.000Z");
    expect(linha.validoAte.toISOString().slice(0, 10)).toBe("2026-11-18");
    expect(linha.resultado).toBe("APTO");
    expect(linha.versaoRegras).toBe("2026-09-30");
    expect(linha.respostas).toMatchObject({ bemHoje: true, peso: 70, declaracao: true });
  });

  it("o GET devolve o mesmo formulário", async () => {
    const { token } = await criarConta();
    const enviado = await enviar(token, respostasLimpas());

    const lido = await obter(token);

    expect(lido.status).toBe(200);
    expect(lido.body.formulario).toEqual(enviado.body.formulario);
  });

  it("o doador pode usar o próprio id no caminho no lugar de “me”", async () => {
    const { token, doador } = await criarConta();
    expect((await enviar(token, respostasLimpas(), doador.id)).status).toBe(201);
    expect((await obter(token, doador.id)).body.formulario.resultado).toBe("APTO");
  });
});

describe("cenário 2: doador temporariamente inapto", () => {
  // Tatuagem feita há 3 dias em local seguro: pode doar 7 dias depois (23/10/2026).
  const tatuagemRecente = () =>
    respostasLimpas({ procedimentos: { tatuagem: { data: "2026-10-16", seguro: "sim" } } });

  it("calcula a data de retorno, bloqueia o agendamento e mostra o motivo", async () => {
    const { token } = await criarConta();

    const resposta = await enviar(token, tatuagemRecente());

    expect(resposta.status).toBe(201);
    const f = resposta.body.formulario;
    expect(f.resultado).toBe("INAPTO_TEMPORARIO");
    expect(f.liberadoEm).toBe("2026-10-23");
    expect(f.mensagem).toBe("No momento você não está apto(a) para realizar doações. O agendamento estará disponível a partir de 23/10/2026.");
    expect(f.motivos).toHaveLength(1);
    expect(f.motivos[0]).toMatchObject({ codigo: "procedimentos.tatuagem", tipo: "TEMPORARIO", ate: "2026-10-23", fonte: "Anexo 2 (parte A); Art. 66, VII" });
    expect(f.motivos[0].mensagem).toContain("Tatuagem recente");
    expect(f.agendamentoLiberado).toBe(false);
    expect(f.bloqueioAgendamento).toBe(f.mensagem);
  });

  it("no dia da data de retorno o agendamento abre sozinho (e um dia antes ainda não)", async () => {
    const { token } = await criarConta();
    await enviar(token, tatuagemRecente());

    agoraEm(diaDepois(3)); // 22/10
    expect((await obter(token)).body.formulario.agendamentoLiberado).toBe(false);

    agoraEm(diaDepois(4)); // 23/10
    const aberto = (await obter(token)).body.formulario;
    expect(aberto.agendamentoLiberado).toBe(true);
    expect(aberto.bloqueioAgendamento).toBeNull();
    expect(aberto.resultado).toBe("INAPTO_TEMPORARIO"); // o resultado guardado não muda; só o agendamento abre
  });

  it("sem data de retorno (ainda com sintomas), o agendamento só abre respondendo de novo", async () => {
    const { token } = await criarConta();
    const f = (await enviar(token, respostasLimpas({ gripe: true, gripeFebre: false, gripeSituacao: "ainda" }))).body.formulario;

    expect(f.resultado).toBe("INAPTO_TEMPORARIO");
    expect(f.liberadoEm).toBeNull();
    expect(f.mensagem).toContain("Responda ao formulário de novo");

    agoraEm(diaDepois(20));
    expect((await obter(token)).body.formulario.agendamentoLiberado).toBe(false);

    const novo = (await enviar(token, respostasLimpas())).body.formulario;
    expect(novo.resultado).toBe("APTO");
    expect(novo.agendamentoLiberado).toBe(true);
  });
});

describe("outros resultados", () => {
  it("inapto (ex.: peso abaixo de 50 kg): não libera o agendamento", async () => {
    const { token } = await criarConta();

    const f = (await enviar(token, respostasLimpas({ peso: 49 }))).body.formulario;

    expect(f.resultado).toBe("INAPTO");
    expect(f.liberadoEm).toBeNull();
    expect(f.motivos[0]).toMatchObject({ codigo: "peso.minimo", tipo: "INAPTO" });
    expect(f.agendamentoLiberado).toBe(false);
    expect(f.bloqueioAgendamento).toContain("não é indicada");

    agoraEm(diaDepois(10));
    expect((await obter(token)).body.formulario.agendamentoLiberado).toBe(false);
  });

  it("inapto por idade (15 anos): o motivo traz o dia em que faz 16", async () => {
    const { token } = await criarConta({ dataNascimento: "2010-10-20" });

    const f = (await enviar(token, respostasLimpas())).body.formulario;

    expect(f.resultado).toBe("INAPTO");
    expect(f.motivos[0]).toMatchObject({ codigo: "idade.minima" });
    expect(f.motivos[0].mensagem).toContain("20/10/2026");
  });

  it("16 anos: apto, com o aviso da autorização do responsável", async () => {
    const { token } = await criarConta({ dataNascimento: "2010-10-19" });

    const f = (await enviar(token, respostasLimpas())).body.formulario;

    expect(f.resultado).toBe("APTO");
    expect(f.avisos.join(" ")).toContain("autorização escrita do responsável");
  });

  it("precisa de avaliação: o agendamento fica liberado, com os pontos a avaliar", async () => {
    const { token } = await criarConta();

    const f = (await enviar(token, respostasLimpas({ condicoes: { epilepsia: {} } }))).body.formulario;

    expect(f.resultado).toBe("AVALIACAO");
    expect(f.agendamentoLiberado).toBe(true);
    expect(f.motivos).toHaveLength(1);
    expect(f.mensagem).toContain("A triagem no hemocentro vai avaliar");
  });
});

describe("cenário 3: formulário não atualizado no prazo (RN-003 e RN-004)", () => {
  it("vale por 30 dias: no último dia ainda libera; no dia seguinte pede para responder de novo", async () => {
    const { token } = await criarConta();
    await enviar(token, respostasLimpas());

    agoraEm(diaDepois(30)); // 18/11: último dia de validade
    expect((await obter(token)).body.formulario).toMatchObject({ vencido: false, agendamentoLiberado: true });

    agoraEm(diaDepois(31)); // 19/11
    const vencido = (await obter(token)).body.formulario;
    expect(vencido).toMatchObject({ vencido: true, agendamentoLiberado: false });
    expect(vencido.bloqueioAgendamento).toBe(MSG_FORMULARIO_VENCIDO);
    expect(vencido.bloqueioAgendamento).toBe("Suas informações de elegibilidade precisam ser atualizadas. Responda ao formulário para continuar agendando doações.");
  });

  it("espera longa (4 meses) vence antes da data de retorno: é preciso responder de novo", async () => {
    const { token } = await criarConta();
    // Transfusão há 10 dias: volta em 4 meses.
    const f = (await enviar(token, respostasLimpas({ transfusao: true, transfusaoData: "2026-10-09" }))).body.formulario;
    expect(f.liberadoEm).toBe("2027-02-09");

    agoraEm(diaDepois(31));
    const vencido = (await obter(token)).body.formulario;
    expect(vencido.vencido).toBe(true);
    expect(vencido.agendamentoLiberado).toBe(false);
  });
});

describe("cenário 4: campos obrigatórios em branco", () => {
  it("bloqueia o envio, devolve a mensagem do documento e aponta as perguntas", async () => {
    const { token, doador } = await criarConta();
    const { bemHoje: _a, peso: _b, ...incompleto } = respostasLimpas();

    const resposta = await enviar(token, incompleto);

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem).toBe("Responda todas as perguntas obrigatórias para continuar.");
    expect(resposta.body.campos).toEqual({ bemHoje: "Esta pergunta é obrigatória.", peso: "Esta pergunta é obrigatória." });
    expect(await prisma.formularioElegibilidade.count({ where: { doadorId: doador.id } })).toBe(0);
  });

  it("corpo vazio ou sem “respostas” também é recusado", async () => {
    const { token } = await criarConta();
    expect((await request(app).post("/doadores/me/formulario").set(comToken(token)).send({})).status).toBe(400);
    expect((await request(app).post("/doadores/me/formulario").set(comToken(token))).status).toBe(400);
  });

  it("valor inválido (data no futuro) é recusado e não grava nada", async () => {
    const { token, doador } = await criarConta();

    const resposta = await enviar(token, respostasLimpas({ transfusao: true, transfusaoData: "2026-12-31" }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem).toBe("Confira as respostas destacadas.");
    expect(resposta.body.campos).toEqual({ transfusaoData: "Informe uma data válida, que não esteja no futuro." });
    expect(await prisma.formularioElegibilidade.count({ where: { doadorId: doador.id } })).toBe(0);
  });
});

describe("responder de novo", () => {
  it("substitui o formulário anterior (só o mais recente fica guardado)", async () => {
    const { token, doador } = await criarConta();
    await enviar(token, respostasLimpas({ peso: 45 }));
    agoraEm(diaDepois(2));

    const novo = (await enviar(token, respostasLimpas({ peso: 52 }))).body.formulario;

    expect(novo.resultado).toBe("APTO");
    expect(novo.preenchidoEm).toBe(diaDepois(2));
    expect(novo.validoAte).toBe("2026-11-20");
    expect(await prisma.formularioElegibilidade.count({ where: { doadorId: doador.id } })).toBe(1);
    expect((await obter(token)).body.formulario.resultado).toBe("APTO");
  });

  it("guarda só as respostas que valem (as de perguntas que não aparecem são descartadas)", async () => {
    const { token, doador } = await criarConta();

    await enviar(token, respostasLimpas({ gripe: false, gripeFim: "2026-10-01", campoInventado: "x", sexo: "M", gestacao: { gravida: {} } }));

    const linha = await prisma.formularioElegibilidade.findUniqueOrThrow({ where: { doadorId: doador.id } });
    const guardadas = linha.respostas as Record<string, unknown>;
    expect(guardadas).not.toHaveProperty("gripeFim");
    expect(guardadas).not.toHaveProperty("campoInventado");
    expect(guardadas).not.toHaveProperty("gestacao"); // sexo masculino: o bloco de gestação não vale
  });
});

describe("RNF-002: cada doador só vê e responde o próprio formulário", () => {
  it("A não consegue ver, responder nem baixar as perguntas no formulário de B (403)", async () => {
    const a = await criarConta({ nome: "Doador A" });
    const b = await criarConta({ nome: "Doador B" });
    await enviar(b.token, respostasLimpas({ condicoes: { hiv: {} } }));

    const ver = await obter(a.token, b.doador.id);
    const responder = await enviar(a.token, respostasLimpas(), b.doador.id);
    const modelo = await request(app).get(`/doadores/${b.doador.id}/formulario/modelo`).set(comToken(a.token));

    for (const resposta of [ver, responder, modelo]) {
      expect(resposta.status).toBe(403);
      expect(resposta.body).toEqual({ mensagem: "Você não tem permissão para acessar os dados de outro doador." });
    }
    expect(JSON.stringify(ver.body)).not.toContain("INAPTO");

    // O formulário de B não mudou, e A continua sem formulário.
    expect((await obter(b.token)).body.formulario.resultado).toBe("INAPTO");
    expect((await obter(a.token)).body.formulario).toBeNull();
    expect(await prisma.formularioElegibilidade.count({ where: { doadorId: a.doador.id } })).toBe(0);
  });

  it("cada um vê o seu resultado", async () => {
    const a = await criarConta();
    const b = await criarConta();
    await enviar(a.token, respostasLimpas());
    await enviar(b.token, respostasLimpas({ peso: 40 }));

    expect((await obter(a.token)).body.formulario.resultado).toBe("APTO");
    expect((await obter(b.token)).body.formulario.resultado).toBe("INAPTO");
  });
});

describe("HU-02: o formulário é apagado junto com a conta", () => {
  it("excluir a conta remove o formulário do banco", async () => {
    const { token, doador } = await criarConta();
    await enviar(token, respostasLimpas());
    expect(await prisma.formularioElegibilidade.count({ where: { doadorId: doador.id } })).toBe(1);

    const exclusao = await request(app).delete("/doadores/me").set(comToken(token));

    expect(exclusao.status).toBe(204);
    expect(await prisma.formularioElegibilidade.count({ where: { doadorId: doador.id } })).toBe(0);
  });
});

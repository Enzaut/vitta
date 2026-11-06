import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { AppError } from "../src/errors/AppError";
import { FormularioService } from "../src/services/FormularioService";
import { MSG_FORMULARIO_VENCIDO, MSG_SEM_FORMULARIO } from "../src/triagem/agendamento";
import { definirRelogio } from "../src/utils/relogio";
import { app, comToken, criarConta, limpar } from "./helpers";
import { respostasLimpas } from "./respostas";

// Regras de uso do formulário:
//  RN-003: quem passou fica com o formulário válido por 7 dias;
//  RN-005: quem não passou espera 3 dias para responder de novo;
//  RN-004: antes de marcar uma doação, o app confere se a pessoa passou e se o formulário ainda vale.
// O relógio é fixado em 19/10/2026 (meio-dia em Brasília) e depois "anda" nos testes.

const HORA = 3_600_000;
const INICIO = Date.parse("2026-10-19T15:00:00Z");
const depoisDe = (horas: number) => definirRelogio(() => new Date(INICIO + horas * HORA));
const ISO_DEPOIS_DE_3_DIAS = "2026-10-22T15:00:00.000Z";

const reprovado = () => respostasLimpas({ peso: 49 }); // INAPTO
const temporario = () => respostasLimpas({ transfusao: true, transfusaoData: "2026-10-09" }); // INAPTO_TEMPORARIO
const comAvaliacao = () => respostasLimpas({ condicoes: { epilepsia: {} } }); // AVALIACAO (passou)

const enviar = (token: string, respostas: unknown) => request(app).post("/doadores/me/formulario").set(comToken(token)).send({ respostas });
const obter = (token: string) => request(app).get("/doadores/me/formulario").set(comToken(token));
const verificar = (token: string, id = "me") => request(app).get(`/doadores/${id}/agendamento/verificacao`).set(comToken(token));

beforeAll(limpar);
beforeEach(() => depoisDe(0));
afterEach(async () => {
  definirRelogio(null);
  await limpar();
});
afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("RN-005: quem não passou espera 3 dias para responder de novo", () => {
  it("logo depois de não passar, responder de novo é recusado (429) com a hora em que libera", async () => {
    const { token, doador } = await criarConta();
    await enviar(token, reprovado());

    depoisDe(1);
    const resposta = await enviar(token, respostasLimpas());

    expect(resposta.status).toBe(429);
    expect(resposta.body.mensagem).toBe(
      "Você não passou no formulário da última vez. Para responder de novo, aguarde até 22/10/2026 às 12:00 (3 dias depois da última resposta).",
    );
    expect(resposta.body.podeResponderEm).toBe(ISO_DEPOIS_DE_3_DIAS);
    expect(resposta.headers["retry-after"]).toBe(String(71 * 3600)); // faltam 71 horas

    // Nada mudou no banco: continua o formulário que não passou.
    const linha = await prisma.formularioElegibilidade.findUniqueOrThrow({ where: { doadorId: doador.id } });
    expect(linha.resultado).toBe("INAPTO");
    expect(linha.preenchidoEm.toISOString()).toBe("2026-10-19T15:00:00.000Z");
  });

  it("a espera termina 72 horas depois: 1 segundo antes ainda recusa, na hora aceita", async () => {
    const { token } = await criarConta();
    await enviar(token, reprovado());

    definirRelogio(() => new Date(INICIO + 72 * HORA - 1000));
    expect((await enviar(token, respostasLimpas())).status).toBe(429);

    depoisDe(72);
    const aceito = await enviar(token, respostasLimpas());
    expect(aceito.status).toBe(201);
    expect(aceito.body.formulario).toMatchObject({ resultado: "APTO", aprovado: true });
  });

  it.each([
    ["inapto (peso abaixo de 50 kg)", reprovado, "INAPTO"],
    ["inapto temporário (transfusão recente)", temporario, "INAPTO_TEMPORARIO"],
  ])("vale para %s", async (_nome, respostas, resultado) => {
    const { token } = await criarConta();
    expect((await enviar(token, respostas())).body.formulario.resultado).toBe(resultado);

    depoisDe(2);
    expect((await enviar(token, respostasLimpas())).status).toBe(429);
    depoisDe(72);
    expect((await enviar(token, respostasLimpas())).status).toBe(201);
  });

  it("a recusa por causa da espera vem antes de olhar as respostas", async () => {
    const { token } = await criarConta();
    await enviar(token, reprovado());

    depoisDe(1);
    expect((await request(app).post("/doadores/me/formulario").set(comToken(token)).send({})).status).toBe(429);
  });

  it("quem passou pode responder de novo na hora, sem espera", async () => {
    const { token } = await criarConta();
    const primeiro = (await enviar(token, respostasLimpas())).body.formulario;
    expect(primeiro).toMatchObject({ aprovado: true, podeResponderEm: null, podeResponderAgora: true });

    depoisDe(0.5);
    const segundo = await enviar(token, comAvaliacao());
    expect(segundo.status).toBe(201);
    expect(segundo.body.formulario).toMatchObject({ resultado: "AVALIACAO", aprovado: true });
  });

  it("se numa nova resposta a pessoa deixa de passar, a espera começa dali", async () => {
    const { token } = await criarConta();
    await enviar(token, respostasLimpas());

    depoisDe(1);
    const nova = await enviar(token, reprovado());
    expect(nova.status).toBe(201);
    expect(nova.body.formulario).toMatchObject({ aprovado: false, preenchidoEm: "2026-10-19T16:00:00.000Z", podeResponderEm: "2026-10-22T16:00:00.000Z" });

    depoisDe(2);
    expect((await enviar(token, respostasLimpas())).status).toBe(429);
  });

  it("passando na segunda tentativa, não há mais espera", async () => {
    const { token } = await criarConta();
    await enviar(token, reprovado());

    depoisDe(72);
    expect((await enviar(token, respostasLimpas())).body.formulario.aprovado).toBe(true);

    depoisDe(72 + 1);
    expect((await enviar(token, respostasLimpas())).status).toBe(201);
  });

  it("a espera é de cada doador: a conta de outra pessoa não é afetada", async () => {
    const a = await criarConta({ nome: "Doador A" });
    const b = await criarConta({ nome: "Doador B" });
    await enviar(a.token, reprovado());

    depoisDe(1);
    expect((await enviar(a.token, respostasLimpas())).status).toBe(429);
    expect((await enviar(b.token, respostasLimpas())).status).toBe(201);
  });

  it("o GET mostra se já dá para responder e quando", async () => {
    const { token } = await criarConta();
    await enviar(token, reprovado());

    depoisDe(24);
    expect((await obter(token)).body.formulario).toMatchObject({ podeResponderAgora: false, podeResponderEm: ISO_DEPOIS_DE_3_DIAS });

    depoisDe(72);
    expect((await obter(token)).body.formulario).toMatchObject({ podeResponderAgora: true, podeResponderEm: ISO_DEPOIS_DE_3_DIAS });
  });
});

describe("RN-003: quem passou fica válido por 7 dias", () => {
  it("quem passa com pontos para avaliar também vale 7 dias", async () => {
    const { token } = await criarConta();

    const f = (await enviar(token, comAvaliacao())).body.formulario;

    expect(f).toMatchObject({ resultado: "AVALIACAO", aprovado: true, validoAte: "2026-10-26", agendamentoLiberado: true });
  });

  it("a validade conta o dia de Brasília: resposta às 23h30 de Brasília vale até 7 dias depois, à meia-noite", async () => {
    const { token } = await criarConta();
    definirRelogio(() => new Date("2026-10-20T02:30:00Z")); // 19/10 às 23:30 em Brasília
    const f = (await enviar(token, respostasLimpas())).body.formulario;
    expect(f.validoAte).toBe("2026-10-26");

    definirRelogio(() => new Date("2026-10-27T02:59:00Z")); // 26/10 às 23:59 em Brasília
    expect((await obter(token)).body.formulario).toMatchObject({ vencido: false, agendamentoLiberado: true });

    definirRelogio(() => new Date("2026-10-27T03:00:00Z")); // 27/10 à meia-noite em Brasília
    expect((await obter(token)).body.formulario).toMatchObject({ vencido: true, agendamentoLiberado: false });
  });

  it("depois de vencer, é preciso responder de novo, e a nova resposta renova a validade", async () => {
    const { token } = await criarConta();
    await enviar(token, respostasLimpas());

    depoisDe(24 * 8);
    const vencido = (await obter(token)).body.formulario;
    expect(vencido).toMatchObject({ aprovado: true, vencido: true, agendamentoLiberado: false, bloqueioAgendamento: MSG_FORMULARIO_VENCIDO });

    const novo = (await enviar(token, respostasLimpas())).body.formulario;
    expect(novo).toMatchObject({ vencido: false, agendamentoLiberado: true, validoAte: "2026-11-03" }); // 27/10 + 7 dias
  });

  it("quem não passou e deixou vencer vê o aviso de vencido e já pode responder", async () => {
    const { token } = await criarConta();
    await enviar(token, reprovado());

    depoisDe(24 * 8);
    expect((await obter(token)).body.formulario).toMatchObject({
      aprovado: false,
      vencido: true,
      agendamentoLiberado: false,
      bloqueioAgendamento: MSG_FORMULARIO_VENCIDO,
      podeResponderAgora: true,
    });
  });
});

describe("RN-004: antes de marcar uma doação o app confere se a pessoa passou", () => {
  it("exige login", async () => {
    expect((await request(app).get("/doadores/me/agendamento/verificacao")).status).toBe(401);
  });

  it("um doador não confere a situação de outro (RNF-002)", async () => {
    const a = await criarConta({ nome: "Doador A" });
    const b = await criarConta({ nome: "Doador B" });

    const resposta = await verificar(a.token, b.doador.id);

    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ mensagem: "Você não tem permissão para acessar os dados de outro doador." });
  });

  it("quem nunca respondeu ao formulário não está liberado", async () => {
    const { token } = await criarConta();

    const resposta = await verificar(token);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ liberado: false, codigo: "SEM_FORMULARIO", mensagem: MSG_SEM_FORMULARIO, validoAte: null, podeResponderEm: null });
  });

  it.each([
    ["passou", () => respostasLimpas()],
    ["passou com pontos para avaliar", comAvaliacao],
  ])("quem %s está liberado enquanto o formulário vale", async (_nome, respostas) => {
    const { token } = await criarConta();
    await enviar(token, respostas());

    depoisDe(24 * 3);
    const resposta = await verificar(token);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ liberado: true, codigo: "LIBERADO", mensagem: null, validoAte: "2026-10-26", podeResponderEm: null });
  });

  it.each([
    ["inapto", reprovado],
    ["inapto temporário", temporario],
  ])("quem ficou %s não está liberado", async (_nome, respostas) => {
    const { token } = await criarConta();
    await enviar(token, respostas());

    depoisDe(1);
    const resposta = await verificar(token);

    expect(resposta.body).toMatchObject({ liberado: false, codigo: "NAO_APROVADO", podeResponderEm: ISO_DEPOIS_DE_3_DIAS });
    expect(resposta.body.mensagem).toContain("Você poderá responder ao formulário de novo em 22/10/2026 às 12:00.");
  });

  it("poder responder de novo (depois dos 3 dias) não libera: só passando no formulário", async () => {
    const { token } = await criarConta();
    await enviar(token, reprovado());

    depoisDe(72);
    const resposta = await verificar(token);

    expect(resposta.body).toMatchObject({ liberado: false, codigo: "NAO_APROVADO" });
    expect(resposta.body.mensagem).toContain("Você já pode responder ao formulário de novo.");
  });

  it("a conferência vale para o momento da pergunta: com o tempo, quem estava liberado deixa de estar", async () => {
    const { token } = await criarConta();
    await enviar(token, respostasLimpas());

    depoisDe(24 * 7);
    expect((await verificar(token)).body).toMatchObject({ liberado: true, codigo: "LIBERADO" });

    depoisDe(24 * 8);
    const vencido = await verificar(token);
    expect(vencido.body).toMatchObject({ liberado: false, codigo: "VENCIDO", mensagem: MSG_FORMULARIO_VENCIDO });
  });

  it("e uma resposta nova muda a conferência na hora: quem passou e depois não passa deixa de estar liberado", async () => {
    const { token } = await criarConta();
    await enviar(token, respostasLimpas());
    expect((await verificar(token)).body.liberado).toBe(true);

    depoisDe(1);
    await enviar(token, reprovado());

    expect((await verificar(token)).body).toMatchObject({ liberado: false, codigo: "NAO_APROVADO" });
  });
});

describe("RN-004: a trava que a futura HU-04 (agendar doação) vai usar antes de gravar um agendamento", () => {
  const recusa = (mensagem: string | RegExp) => expect.objectContaining({ status: 403, message: expect.stringMatching(mensagem) });

  it("deixa passar quem está liberado", async () => {
    const { doador, token } = await criarConta();
    await enviar(token, respostasLimpas());

    await expect(FormularioService.exigirAprovadoParaAgendar(doador.id)).resolves.toBeUndefined();
  });

  it("recusa (403) quem nunca respondeu, quem não passou e quem está com o formulário vencido", async () => {
    const semFormulario = await criarConta({ nome: "Sem formulário" });
    const reprovada = await criarConta({ nome: "Reprovada" });
    const vencida = await criarConta({ nome: "Vencida" });
    await enviar(reprovada.token, reprovado());
    await enviar(vencida.token, respostasLimpas());

    depoisDe(1);
    await expect(FormularioService.exigirAprovadoParaAgendar(semFormulario.doador.id)).rejects.toEqual(recusa(MSG_SEM_FORMULARIO));
    await expect(FormularioService.exigirAprovadoParaAgendar(reprovada.doador.id)).rejects.toEqual(recusa(/não é indicada para você/));
    await expect(FormularioService.exigirAprovadoParaAgendar(semFormulario.doador.id)).rejects.toBeInstanceOf(AppError);

    depoisDe(24 * 8);
    await expect(FormularioService.exigirAprovadoParaAgendar(vencida.doador.id)).rejects.toEqual(recusa(MSG_FORMULARIO_VENCIDO));
  });
});

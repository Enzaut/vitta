import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { agendaSimulada, definirAgenda } from "../src/agenda/agendaSimulada";
import { InstituicaoIndisponivelError, type AgendaDaInstituicao } from "../src/agenda/tipos";
import { prisma } from "../src/db";
import {
  MSG_AGENDA_FORA_DO_AR,
  MSG_CANCELADO,
  MSG_CANCELAMENTO_FALHOU,
  MSG_HORARIO_INDISPONIVEL,
  MSG_INSTITUICAO_FORA_DO_AR,
  MSG_JA_PASSOU,
  MSG_NAO_CANCELAVEL,
} from "../src/services/AgendamentoService";
import { MSG_FORMULARIO_VENCIDO, MSG_SEM_FORMULARIO } from "../src/triagem/agendamento";
import { formatarDataHoraBr } from "../src/triagem/datas";
import { definirRelogio } from "../src/utils/relogio";
import { MSG_HORARIO_INVALIDO, MSG_INSTITUICAO_INVALIDA, MSG_OBRIGATORIO, MSG_STATUS } from "../src/validators/agendamentoValidator";
import { MSG_TIPO_SANGUINEO } from "../src/validators/perfilValidator";
import { app, comToken, criarConta, limpar } from "./helpers";
import { respostasLimpas } from "./respostas";

// HU-04 (agendar doação), HU-06 (cancelar) e as regras ligadas: RN-004 (só agenda quem passou no formulário e ainda vale),
// RN-005 (o pedido vai para a instituição, aqui uma simulação), RN-006 (só cancela o que está Agendado).
// O relógio é fixado em segunda-feira, 19/10/2026, 12:00 em Brasília, e anda nos testes que precisam.

const HORA = 3_600_000;
const INICIO = new Date("2026-10-19T15:00:00Z");
let deslocamento = 0;
const andarAte = (momento: Date | string) => {
  deslocamento = new Date(momento).getTime() - INICIO.getTime();
};

type Horario = { data: string; medicoCodigo: string; medicoNome: string; especialidade: string; inicio: string; hora: string; status: "LIVRE" | "OCUPADO" };

let instituicoes: Array<{ id: string; nome: string }>;
const [CODIGO_1, CODIGO_2] = ["agenda-teste-1", "agenda-teste-2"];

const apagarFixtures = () => prisma.instituicao.deleteMany({ where: { codigo: { startsWith: "agenda-teste-" } } });

beforeAll(async () => {
  await limpar();
  await apagarFixtures();
  const base = { endereco: "Rua de Teste, 1", cidade: "Cidade de Teste", uf: "DF", horario: "Segunda a sexta, das 8h às 17h", latitude: 10, longitude: 10, tiposEmFalta: [], demonstracao: true };
  instituicoes = [
    await prisma.instituicao.create({ data: { codigo: CODIGO_1, nome: "Posto Agenda Teste 1", ...base } }),
    await prisma.instituicao.create({ data: { codigo: CODIGO_2, nome: "Posto Agenda Teste 2", ...base } }),
  ];
});
beforeEach(() => {
  deslocamento = 0;
  definirRelogio(() => new Date(INICIO.getTime() + deslocamento));
});
afterEach(async () => {
  definirRelogio(null);
  definirAgenda(null);
  await limpar();
});
afterAll(async () => {
  await limpar();
  await apagarFixtures();
  await prisma.$disconnect();
});

// ---------------------------------------------------------------- ajudantes
const consultarAgenda = (token: string, instituicaoId = instituicoes[0].id) =>
  request(app).get(`/instituicoes/${instituicaoId}/agenda`).set(comToken(token));
const agendar = (token: string, corpo: unknown) => request(app).post("/doadores/me/agendamentos").set(comToken(token)).send(corpo as object);
const cancelar = (token: string, id: string) => request(app).delete(`/doadores/me/agendamentos/${id}`).set(comToken(token));
const proximo = (token: string) => request(app).get("/doadores/me/agendamentos/proximo").set(comToken(token));
const listar = (token: string, status?: string) =>
  request(app).get("/doadores/me/agendamentos").query(status ? { status } : {}).set(comToken(token));

async function horarios(token: string, instituicaoId = instituicoes[0].id): Promise<Horario[]> {
  const resposta = await consultarAgenda(token, instituicaoId);
  expect(resposta.status).toBe(200);
  return resposta.body.dias.flatMap((dia: any) =>
    dia.medicos.flatMap((medico: any) =>
      medico.horarios.map((h: any) => ({ data: dia.data, medicoCodigo: medico.codigo, medicoNome: medico.nome, especialidade: medico.especialidade, ...h })),
    ),
  );
}
const livres = async (token: string, instituicaoId?: string) => (await horarios(token, instituicaoId)).filter((h) => h.status === "LIVRE");
const ocupados = async (token: string) => (await horarios(token)).filter((h) => h.status === "OCUPADO");

const pedido = (h: Horario, extra: Record<string, unknown> = {}) => ({
  instituicaoId: instituicoes[0].id,
  medicoCodigo: h.medicoCodigo,
  inicio: h.inicio,
  tipoSanguineo: "O+",
  ...extra,
});

const responderFormulario = (token: string, respostas: object) =>
  request(app).post("/doadores/me/formulario").set(comToken(token)).send({ respostas });

// Doador que passou no formulário (RN-004): é quem pode agendar.
async function doadorLiberado(extra: Record<string, unknown> = {}) {
  const conta = await criarConta(extra);
  const resposta = await responderFormulario(conta.token, respostasLimpas());
  expect(resposta.status).toBe(201);
  expect(resposta.body.formulario.agendamentoLiberado).toBe(true);
  return conta;
}

const contarNoBanco = (doadorId: string, status = "AGENDADO") => prisma.agendamento.count({ where: { doadorId, status: status as "AGENDADO" } });

// ---------------------------------------------------------------- a agenda da instituição
describe("agenda da instituição: médicos e horários livres e ocupados", () => {
  it("exige login", async () => {
    expect((await request(app).get(`/instituicoes/${instituicoes[0].id}/agenda`)).status).toBe(401);
  });

  it("instituição que não existe: 404", async () => {
    const { token } = await criarConta();

    const resposta = await consultarAgenda(token, randomUUID());

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ mensagem: "Instituição não encontrada." });
  });

  it("mostra os médicos e os horários dos próximos dias, livres e ocupados", async () => {
    const { token } = await criarConta();

    const resposta = await consultarAgenda(token);

    expect(resposta.status).toBe(200);
    expect(resposta.body.simulado).toBe(true);
    expect(resposta.body.instituicao).toEqual({ id: instituicoes[0].id, nome: "Posto Agenda Teste 1", demonstracao: true });

    const dias = resposta.body.dias;
    expect(dias.length).toBeGreaterThan(5);
    expect(dias.length).toBeLessThanOrEqual(14);
    const datas = dias.map((d: { data: string }) => d.data);
    expect(datas).toEqual([...datas].sort());
    expect(datas[0]).toBe("2026-10-19"); // hoje
    expect(datas).not.toContain("2026-10-25"); // domingo: ninguém atende

    for (const dia of dias) {
      const todos = dia.medicos.flatMap((m: { horarios: Array<{ status: string }> }) => m.horarios);
      expect(dia.livres).toBe(todos.filter((h: { status: string }) => h.status === "LIVRE").length);
      expect(dia.ocupados).toBe(todos.filter((h: { status: string }) => h.status === "OCUPADO").length);
    }

    const todos = await horarios(token);
    expect(todos.some((h) => h.status === "LIVRE")).toBe(true);
    expect(todos.some((h) => h.status === "OCUPADO")).toBe(true);
    for (const h of todos) {
      expect(new Date(h.inicio).toISOString()).toBe(h.inicio);
      expect(h.hora).toMatch(/^\d{2}:\d{2}$/);
      expect(h.medicoNome).toMatch(/^Dr[a]?\. /);
      expect(h.especialidade.length).toBeGreaterThan(0);
    }
    // Hoje só sobram os horários que começam daqui a pelo menos 2 horas (agora são 12:00).
    const hoje = todos.filter((h) => h.data === "2026-10-19");
    expect(hoje.length).toBeGreaterThan(0);
    expect(hoje.every((h) => h.hora >= "14:00")).toBe(true);
  });

  it("é a mesma agenda a cada consulta e para qualquer doador", async () => {
    const a = await criarConta();
    const b = await criarConta();

    const doA = (await consultarAgenda(a.token)).body;
    const doB = (await consultarAgenda(b.token)).body;

    expect(doB).toEqual(doA);
    expect((await consultarAgenda(a.token)).body).toEqual(doA);
  });

  it("outra instituição tem outra agenda", async () => {
    const { token } = await criarConta();

    const primeira = await horarios(token, instituicoes[0].id);
    const segunda = await horarios(token, instituicoes[1].id);

    expect(segunda.length).toBeGreaterThan(0);
    expect(segunda.map((h) => h.medicoCodigo)).not.toEqual(primeira.map((h) => h.medicoCodigo));
    expect(segunda.every((h) => h.medicoCodigo.startsWith(`${CODIGO_2}-`))).toBe(true);
  });

  it("o horário reservado aparece ocupado para os outros e volta a ficar livre quando é cancelado", async () => {
    const a = await doadorLiberado();
    const b = await criarConta();
    const [escolhido] = await livres(a.token);

    const reserva = await agendar(a.token, pedido(escolhido));
    expect(reserva.status).toBe(201);

    const visto = (await horarios(b.token)).find((h) => h.medicoCodigo === escolhido.medicoCodigo && h.inicio === escolhido.inicio);
    expect(visto!.status).toBe("OCUPADO");

    expect((await cancelar(a.token, reserva.body.agendamento.id)).status).toBe(200);

    const depois = (await horarios(b.token)).find((h) => h.medicoCodigo === escolhido.medicoCodigo && h.inicio === escolhido.inicio);
    expect(depois!.status).toBe("LIVRE");
  });
});

// ---------------------------------------------------------------- cenário 1
describe("HU-04, cenário 1: agendamento realizado com sucesso", () => {
  it("reserva o horário e confirma com a mensagem da HU-04", async () => {
    const { token, doador } = await doadorLiberado();
    const [escolhido] = await livres(token);

    const resposta = await agendar(token, pedido(escolhido));

    expect(resposta.status).toBe(201);
    expect(resposta.body.mensagem).toBe(
      `Agendamento realizado com sucesso! Nos vemos em ${formatarDataHoraBr(new Date(escolhido.inicio))} no Posto Agenda Teste 1.`,
    );
    const a = resposta.body.agendamento;
    expect(a).toMatchObject({
      status: "AGENDADO",
      inicio: escolhido.inicio,
      data: escolhido.data,
      hora: escolhido.hora,
      instituicao: { id: instituicoes[0].id, nome: "Posto Agenda Teste 1", demonstracao: true },
      medico: { codigo: escolhido.medicoCodigo, nome: escolhido.medicoNome, especialidade: escolhido.especialidade },
      tipoSanguineo: "O+",
      canceladoEm: null,
    });
    expect(a.protocolo).toMatch(/^SIM-[0-9A-F]{8}$/);
    expect(new Date(a.fim).getTime() - new Date(a.inicio).getTime()).toBe(30 * 60_000);
    expect(a.horaFim).toMatch(/^\d{2}:\d{2}$/);

    const linha = await prisma.agendamento.findUniqueOrThrow({ where: { id: a.id } });
    expect(linha).toMatchObject({ doadorId: doador.id, status: "AGENDADO", medicoCodigo: escolhido.medicoCodigo, duracaoMin: 30 });
    expect(linha.reservaDoHorario).toBe(`${instituicoes[0].id}|${escolhido.medicoCodigo}|${escolhido.inicio}`);
  });

  it("o tipo sanguíneo confirmado ao agendar atualiza o perfil", async () => {
    const { token } = await doadorLiberado();
    expect((await request(app).get("/doadores/me").set(comToken(token))).body.doador.tipoSanguineo).toBeNull();
    const [escolhido] = await livres(token);

    const resposta = await agendar(token, pedido(escolhido, { tipoSanguineo: "A-" }));

    expect(resposta.status).toBe(201);
    expect(resposta.body.agendamento.tipoSanguineo).toBe("A-");
    expect((await request(app).get("/doadores/me").set(comToken(token))).body.doador.tipoSanguineo).toBe("A-");
  });

  it("aceita o tipo sanguíneo em minúsculas e com espaços", async () => {
    const { token } = await doadorLiberado();
    const [escolhido] = await livres(token);

    const resposta = await agendar(token, pedido(escolhido, { tipoSanguineo: " ab+ " }));

    expect(resposta.status).toBe(201);
    expect(resposta.body.agendamento.tipoSanguineo).toBe("AB+");
  });

  it("o novo agendamento é o próximo e consta na lista (base da HU-06)", async () => {
    const { token } = await doadorLiberado();
    expect((await proximo(token)).body).toEqual({ agendamento: null });
    const [escolhido] = await livres(token);

    const criado = (await agendar(token, pedido(escolhido))).body.agendamento;

    expect((await proximo(token)).body).toEqual({ agendamento: criado });
    expect((await listar(token)).body).toEqual({ agendamentos: [criado] });
  });
});

// ---------------------------------------------------------------- cenário 2
describe("HU-04, cenário 2: quem não pode agendar (RN-004)", () => {
  async function umHorarioQualquer(token: string) {
    return (await livres(token))[0];
  }

  it("quem nunca respondeu ao formulário é barrado e nada é gravado", async () => {
    const { token, doador } = await criarConta();
    const escolhido = await umHorarioQualquer(token);

    const resposta = await agendar(token, pedido(escolhido));

    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ mensagem: MSG_SEM_FORMULARIO });
    expect(await prisma.agendamento.count({ where: { doadorId: doador.id } })).toBe(0);
  });

  it("quem deixou o formulário vencer (7 dias) é barrado, com a mensagem da HU-03", async () => {
    const { token } = await doadorLiberado();
    andarAte("2026-10-27T15:00:00Z"); // 8 dias depois: o formulário valia até 26/10
    const escolhido = await umHorarioQualquer(token);

    const resposta = await agendar(token, pedido(escolhido));

    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ mensagem: MSG_FORMULARIO_VENCIDO });
  });

  it.each([
    ["inapto (peso abaixo de 50 kg)", () => respostasLimpas({ peso: 49 }), "não é indicada para você"],
    ["inapto temporário (transfusão recente)", () => respostasLimpas({ transfusao: true, transfusaoData: "2026-10-09" }), "não está apto(a)"],
  ])("quem não passou no formulário (%s) é barrado", async (_nome, respostas, trecho) => {
    const { token, doador } = await criarConta();
    expect((await responderFormulario(token, respostas())).status).toBe(201);
    const escolhido = await umHorarioQualquer(token);

    const resposta = await agendar(token, pedido(escolhido));

    expect(resposta.status).toBe(403);
    expect(resposta.body.mensagem).toContain(trecho);
    expect(await prisma.agendamento.count({ where: { doadorId: doador.id } })).toBe(0);
  });

  it("a conferência vem antes da validação: quem não pode agendar e manda o corpo vazio recebe 403, não 400", async () => {
    const { token } = await criarConta();

    const resposta = await agendar(token, {});

    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ mensagem: MSG_SEM_FORMULARIO });
  });

  it("a conferência é refeita a cada pedido: quem passou e depois não passa deixa de poder agendar", async () => {
    const { token } = await doadorLiberado();
    const [primeiro, segundo] = await livres(token);
    expect((await agendar(token, pedido(primeiro))).status).toBe(201);
    expect((await cancelar(token, (await proximo(token)).body.agendamento.id)).status).toBe(200);

    expect((await responderFormulario(token, respostasLimpas({ peso: 49 }))).status).toBe(201);
    const resposta = await agendar(token, pedido(segundo));

    expect(resposta.status).toBe(403);
    expect(resposta.body.mensagem).toContain("não é indicada para você");
  });
});

// ---------------------------------------------------------------- cenário 3
describe("HU-04, cenário 3: campos obrigatórios e valores inválidos", () => {
  it("campos em branco: 400 com 'Este campo é obrigatório.' em cada um e nada é gravado", async () => {
    const { token, doador } = await doadorLiberado();

    const resposta = await agendar(token, {});

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({
      mensagem: "Dados inválidos.",
      campos: { instituicaoId: MSG_OBRIGATORIO, medicoCodigo: MSG_OBRIGATORIO, inicio: MSG_OBRIGATORIO, tipoSanguineo: MSG_OBRIGATORIO },
    });
    expect(await prisma.agendamento.count({ where: { doadorId: doador.id } })).toBe(0);
  });

  it("textos só com espaços contam como em branco", async () => {
    const { token } = await doadorLiberado();

    const resposta = await agendar(token, { instituicaoId: "  ", medicoCodigo: "", inicio: " ", tipoSanguineo: "   " });

    expect(resposta.status).toBe(400);
    expect(Object.values(resposta.body.campos)).toEqual([MSG_OBRIGATORIO, MSG_OBRIGATORIO, MSG_OBRIGATORIO, MSG_OBRIGATORIO]);
  });

  it("só o que falta é apontado", async () => {
    const { token } = await doadorLiberado();
    const [escolhido] = await livres(token);

    const resposta = await agendar(token, pedido(escolhido, { tipoSanguineo: undefined }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ tipoSanguineo: MSG_OBRIGATORIO });
  });

  it("tipo sanguíneo que não existe é recusado", async () => {
    const { token } = await doadorLiberado();
    const [escolhido] = await livres(token);

    const resposta = await agendar(token, pedido(escolhido, { tipoSanguineo: "Z+" }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ tipoSanguineo: MSG_TIPO_SANGUINEO });
  });

  it("data e hora em formato estranho são recusadas", async () => {
    const { token } = await doadorLiberado();
    const [escolhido] = await livres(token);

    const resposta = await agendar(token, pedido(escolhido, { inicio: "amanhã às 8" }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ inicio: MSG_HORARIO_INVALIDO });
  });

  it("instituição que não existe é recusada", async () => {
    const { token } = await doadorLiberado();
    const [escolhido] = await livres(token);

    const resposta = await agendar(token, pedido(escolhido, { instituicaoId: randomUUID() }));

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ instituicaoId: MSG_INSTITUICAO_INVALIDA });
  });

  it.each([
    ["médico que não existe", (h: Horario) => ({ medicoCodigo: "medico-que-nao-existe", inicio: h.inicio })],
    ["médico de outra instituição", (h: Horario) => ({ instituicaoId: instituicoes[1].id, inicio: h.inicio, medicoCodigo: h.medicoCodigo })],
    ["horário fora da grade (7 minutos depois)", (h: Horario) => ({ inicio: new Date(new Date(h.inicio).getTime() + 7 * 60_000).toISOString() })],
    ["horário que já passou", () => ({ inicio: "2026-10-19T14:00:00.000Z" })],
    ["horário a menos de 2 horas", () => ({ inicio: "2026-10-19T16:00:00.000Z" })],
    ["domingo, quando ninguém atende", () => ({ inicio: "2026-10-25T14:00:00.000Z" })],
    // A janela vai de 19/10 a 01/11. Segunda, 02/11, às 11:00 em Brasília, já é o 15º dia.
    ["15º dia à frente (fora da janela de 14 dias)", () => ({ inicio: "2026-11-02T14:00:00.000Z" })],
    ["mais de 14 dias à frente", () => ({ inicio: "2026-11-10T14:00:00.000Z" })],
  ])("horário que não existe na agenda (%s): 400 e nada é gravado", async (_nome, alterar) => {
    const { token, doador } = await doadorLiberado();
    const [escolhido] = await livres(token);

    const resposta = await agendar(token, { ...pedido(escolhido), ...alterar(escolhido) });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ inicio: MSG_HORARIO_INVALIDO });
    expect(await prisma.agendamento.count({ where: { doadorId: doador.id } })).toBe(0);
  });
});

// ---------------------------------------------------------------- exceção E01
describe("Caso de Uso, exceção E01: horário indisponível", () => {
  it("horário ocupado: 409 e nada é gravado", async () => {
    const { token, doador } = await doadorLiberado();
    const [tomado] = await ocupados(token);

    const resposta = await agendar(token, pedido(tomado));

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ mensagem: MSG_HORARIO_INDISPONIVEL });
    expect(await prisma.agendamento.count({ where: { doadorId: doador.id } })).toBe(0);
  });

  it("dois doadores no mesmo horário: o segundo recebe 409 e o primeiro fica com o horário", async () => {
    const a = await doadorLiberado();
    const b = await doadorLiberado();
    const [escolhido] = await livres(a.token);

    const primeiro = await agendar(a.token, pedido(escolhido));
    const segundo = await agendar(b.token, pedido(escolhido));

    expect(primeiro.status).toBe(201);
    expect(segundo.status).toBe(409);
    expect(segundo.body).toEqual({ mensagem: MSG_HORARIO_INDISPONIVEL });
    expect((await proximo(a.token)).body.agendamento.id).toBe(primeiro.body.agendamento.id);
    expect((await proximo(b.token)).body).toEqual({ agendamento: null });
  });

  it("dois pedidos ao mesmo tempo para o mesmo horário: só um passa", async () => {
    const a = await doadorLiberado();
    const b = await doadorLiberado();
    const [escolhido] = await livres(a.token);

    const respostas = await Promise.all([agendar(a.token, pedido(escolhido)), agendar(b.token, pedido(escolhido))]);

    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.agendamento.count({ where: { medicoCodigo: escolhido.medicoCodigo, inicio: new Date(escolhido.inicio), status: "AGENDADO" } })).toBe(1);
  });

  it("o mesmo horário de outro médico, ou do mesmo médico em outra hora, continua livre", async () => {
    const a = await doadorLiberado();
    const b = await doadorLiberado();
    const [primeiro, ...resto] = await livres(a.token);
    const outro = resto.find((h) => h.medicoCodigo !== primeiro.medicoCodigo || h.inicio !== primeiro.inicio)!;

    expect((await agendar(a.token, pedido(primeiro))).status).toBe(201);
    expect((await agendar(b.token, pedido(outro))).status).toBe(201);
  });
});

// ---------------------------------------------------------------- um agendamento por vez
describe("um agendamento por vez", () => {
  it("quem já tem um agendamento por vir não marca outro, e a mensagem diz quando é o primeiro", async () => {
    const { token, doador } = await doadorLiberado();
    const [primeiro, segundo] = await livres(token);
    expect((await agendar(token, pedido(primeiro))).status).toBe(201);

    const resposta = await agendar(token, pedido(segundo));

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).toBe(
      `Você já tem uma doação agendada para ${formatarDataHoraBr(new Date(primeiro.inicio))}. Para marcar outra, cancele esse agendamento antes.`,
    );
    expect(await contarNoBanco(doador.id)).toBe(1);
  });

  it("dois pedidos ao mesmo tempo do mesmo doador, em horários diferentes: só um passa", async () => {
    const { token, doador } = await doadorLiberado();
    const [primeiro, segundo] = await livres(token);

    const respostas = await Promise.all([agendar(token, pedido(primeiro)), agendar(token, pedido(segundo))]);

    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await contarNoBanco(doador.id)).toBe(1);
  });

  it("depois de cancelar, dá para agendar outro", async () => {
    const { token } = await doadorLiberado();
    const [primeiro, segundo] = await livres(token);
    const criado = (await agendar(token, pedido(primeiro))).body.agendamento;
    expect((await cancelar(token, criado.id)).status).toBe(200);

    const resposta = await agendar(token, pedido(segundo));

    expect(resposta.status).toBe(201);
    expect((await proximo(token)).body.agendamento.id).toBe(resposta.body.agendamento.id);
  });

  it("depois de cancelar, o mesmo horário volta a poder ser agendado (por qualquer um)", async () => {
    const a = await doadorLiberado();
    const b = await doadorLiberado();
    const [escolhido] = await livres(a.token);
    const criado = (await agendar(a.token, pedido(escolhido))).body.agendamento;
    expect((await cancelar(a.token, criado.id)).status).toBe(200);

    const resposta = await agendar(b.token, pedido(escolhido));

    expect(resposta.status).toBe(201);
  });

  it("um agendamento que já aconteceu não impede de marcar outro", async () => {
    const { token } = await doadorLiberado();
    const [primeiro] = await livres(token);
    expect((await agendar(token, pedido(primeiro))).status).toBe(201);

    andarAte(new Date(new Date(primeiro.inicio).getTime() + HORA)); // uma hora depois do começo
    expect((await proximo(token)).body).toEqual({ agendamento: null });
    const [outro] = await livres(token);
    const resposta = await agendar(token, pedido(outro));

    expect(resposta.status).toBe(201);
    expect((await listar(token)).body.agendamentos).toHaveLength(2);
  });
});

// ---------------------------------------------------------------- cenário 4
describe("HU-04, cenário 4: a instituição não responde", () => {
  const foraDoAr: AgendaDaInstituicao = {
    simulado: true,
    consultar: async () => {
      throw new InstituicaoIndisponivelError();
    },
    reservar: async () => {
      throw new InstituicaoIndisponivelError();
    },
    cancelar: async () => {
      throw new InstituicaoIndisponivelError();
    },
  };

  it("ao agendar: 502 com a mensagem da HU-04 e o agendamento não é registrado", async () => {
    const { token, doador } = await doadorLiberado();
    const [escolhido] = await livres(token);
    definirAgenda(foraDoAr);

    const resposta = await agendar(token, pedido(escolhido));

    expect(resposta.status).toBe(502);
    expect(resposta.body).toEqual({ mensagem: MSG_INSTITUICAO_FORA_DO_AR });
    expect(await prisma.agendamento.count({ where: { doadorId: doador.id } })).toBe(0);

    // Voltando a instituição, o mesmo pedido passa.
    definirAgenda(null);
    expect((await agendar(token, pedido(escolhido))).status).toBe(201);
  });

  it("ao consultar a agenda: 502", async () => {
    const { token } = await criarConta();
    definirAgenda(foraDoAr);

    const resposta = await consultarAgenda(token);

    expect(resposta.status).toBe(502);
    expect(resposta.body).toEqual({ mensagem: MSG_AGENDA_FORA_DO_AR });
  });

  it("ao cancelar: 502 e o agendamento continua Agendado", async () => {
    const { token, doador } = await doadorLiberado();
    const [escolhido] = await livres(token);
    const criado = (await agendar(token, pedido(escolhido))).body.agendamento;
    definirAgenda(foraDoAr);

    const resposta = await cancelar(token, criado.id);

    expect(resposta.status).toBe(502);
    expect(resposta.body).toEqual({ mensagem: MSG_CANCELAMENTO_FALHOU });
    expect(await contarNoBanco(doador.id)).toBe(1);
  });

  it("se o horário foi tomado no último instante, o pedido feito à instituição é desfeito", async () => {
    const a = await doadorLiberado();
    const b = await doadorLiberado();
    const [escolhido] = await livres(a.token);
    expect((await agendar(a.token, pedido(escolhido))).status).toBe(201);

    // Uma instituição que confirma tudo sem olhar (como se tivesse respondido antes do primeiro pedido chegar).
    const cancelados: string[] = [];
    definirAgenda({
      simulado: true,
      consultar: (instituicao, agora) => agendaSimulada.consultar(instituicao, agora),
      reservar: async () => ({
        protocolo: "SIM-CONFIANTE",
        medico: { codigo: escolhido.medicoCodigo, nome: escolhido.medicoNome, especialidade: escolhido.especialidade },
        duracaoMin: 30,
      }),
      cancelar: async (protocolo) => {
        cancelados.push(protocolo);
      },
    });

    const resposta = await agendar(b.token, pedido(escolhido));

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ mensagem: MSG_HORARIO_INDISPONIVEL });
    expect(cancelados).toEqual(["SIM-CONFIANTE"]);
    expect((await proximo(a.token)).body.agendamento).not.toBeNull();
    expect((await proximo(b.token)).body).toEqual({ agendamento: null });
  });
});

// ---------------------------------------------------------------- cancelar
describe("HU-06 e RN-006: cancelar um agendamento", () => {
  it("cancela: o status vira Cancelado, a instituição é avisada e o horário volta a ficar livre", async () => {
    const { token } = await doadorLiberado();
    const [escolhido] = await livres(token);
    const criado = (await agendar(token, pedido(escolhido))).body.agendamento;

    const resposta = await cancelar(token, criado.id);

    expect(resposta.status).toBe(200);
    expect(resposta.body.mensagem).toBe(MSG_CANCELADO);
    expect(resposta.body.agendamento).toMatchObject({ id: criado.id, status: "CANCELADO" });
    expect(resposta.body.agendamento.canceladoEm).toBe(INICIO.toISOString());

    const linha = await prisma.agendamento.findUniqueOrThrow({ where: { id: criado.id } });
    expect(linha.status).toBe("CANCELADO");
    expect(linha.reservaDoHorario).toBeNull();
    expect((await proximo(token)).body).toEqual({ agendamento: null });
    expect((await listar(token)).body.agendamentos[0]).toMatchObject({ id: criado.id, status: "CANCELADO" });
  });

  it("cancelar de novo: 409 (só se cancela o que está Agendado)", async () => {
    const { token } = await doadorLiberado();
    const [escolhido] = await livres(token);
    const criado = (await agendar(token, pedido(escolhido))).body.agendamento;
    expect((await cancelar(token, criado.id)).status).toBe(200);

    const resposta = await cancelar(token, criado.id);

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ mensagem: MSG_NAO_CANCELAVEL });
  });

  it("um agendamento Finalizado não pode ser cancelado", async () => {
    const { token } = await doadorLiberado();
    const [escolhido] = await livres(token);
    const criado = (await agendar(token, pedido(escolhido))).body.agendamento;
    await prisma.agendamento.update({ where: { id: criado.id }, data: { status: "FINALIZADO" } });

    const resposta = await cancelar(token, criado.id);

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ mensagem: MSG_NAO_CANCELAVEL });
  });

  it("o agendamento de outro doador: 404, e ele continua Agendado", async () => {
    const dono = await doadorLiberado();
    const outro = await criarConta();
    const [escolhido] = await livres(dono.token);
    const criado = (await agendar(dono.token, pedido(escolhido))).body.agendamento;

    const resposta = await cancelar(outro.token, criado.id);

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ mensagem: "Agendamento não encontrado." });
    expect((await prisma.agendamento.findUniqueOrThrow({ where: { id: criado.id } })).status).toBe("AGENDADO");
  });

  it("id que não existe: 404", async () => {
    const { token } = await doadorLiberado();

    const resposta = await cancelar(token, randomUUID());

    expect(resposta.status).toBe(404);
  });

  it("horário que já passou: 409", async () => {
    const { token } = await doadorLiberado();
    const [escolhido] = await livres(token);
    const criado = (await agendar(token, pedido(escolhido))).body.agendamento;
    andarAte(new Date(new Date(escolhido.inicio).getTime() + HORA));

    const resposta = await cancelar(token, criado.id);

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ mensagem: MSG_JA_PASSOU });
  });
});

// ---------------------------------------------------------------- lista
describe("lista de agendamentos do doador", () => {
  it("do mais recente para o mais antigo, com filtro por status", async () => {
    const { token } = await doadorLiberado();
    const todos = await livres(token);
    const antes = todos[0];
    const depois = todos.find((h) => new Date(h.inicio).getTime() - new Date(antes.inicio).getTime() > 24 * HORA)!;
    const cancelado = (await agendar(token, pedido(antes))).body.agendamento;
    expect((await cancelar(token, cancelado.id)).status).toBe(200);
    const ativo = (await agendar(token, pedido(depois))).body.agendamento;

    const lista = (await listar(token)).body.agendamentos;
    expect(lista.map((a: { id: string }) => a.id)).toEqual([ativo.id, cancelado.id]);
    expect((await listar(token, "CANCELADO")).body.agendamentos.map((a: { id: string }) => a.id)).toEqual([cancelado.id]);
    expect((await listar(token, "AGENDADO")).body.agendamentos.map((a: { id: string }) => a.id)).toEqual([ativo.id]);
    expect((await listar(token, "FINALIZADO")).body.agendamentos).toEqual([]);
  });

  it("status inválido: 400", async () => {
    const { token } = await doadorLiberado();

    const resposta = await listar(token, "TALVEZ");

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toEqual({ status: MSG_STATUS });
  });

  it("cada doador vê só os próprios agendamentos", async () => {
    const a = await doadorLiberado();
    const b = await doadorLiberado();
    const [escolhido] = await livres(a.token);
    await agendar(a.token, pedido(escolhido));

    expect((await listar(b.token)).body).toEqual({ agendamentos: [] });
    expect((await proximo(b.token)).body).toEqual({ agendamento: null });
  });
});

// ---------------------------------------------------------------- contas e instituições apagadas
describe("dados apagados junto (RN-012)", () => {
  it("excluir a conta apaga os agendamentos e libera o horário", async () => {
    const dono = await doadorLiberado();
    const outro = await doadorLiberado();
    const [escolhido] = await livres(dono.token);
    expect((await agendar(dono.token, pedido(escolhido))).status).toBe(201);

    expect((await request(app).delete("/doadores/me").set(comToken(dono.token))).status).toBe(204);

    expect(await prisma.agendamento.count({ where: { doadorId: dono.doador.id } })).toBe(0);
    expect((await agendar(outro.token, pedido(escolhido))).status).toBe(201);
  });

  it("apagar uma instituição (como faz o seed sem as de demonstração) apaga os agendamentos dela sem dar erro", async () => {
    const extra = await prisma.instituicao.create({
      data: { codigo: "agenda-teste-3", nome: "Posto Agenda Teste 3", endereco: "Rua 3", cidade: "Cidade", uf: "DF", horario: "Segunda a sexta", latitude: 10, longitude: 10, tiposEmFalta: [], demonstracao: true },
    });
    const { token, doador } = await doadorLiberado();
    const [escolhido] = await livres(token, extra.id);
    const resposta = await agendar(token, pedido(escolhido, { instituicaoId: extra.id }));
    expect(resposta.status).toBe(201);

    await prisma.instituicao.delete({ where: { id: extra.id } });

    expect(await prisma.agendamento.count({ where: { doadorId: doador.id } })).toBe(0);
  });
});

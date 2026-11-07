import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { agendaSimulada, definirAgenda } from "../src/agenda/agendaSimulada";
import { prisma } from "../src/db";
import { AgendamentoRepository } from "../src/repositories/AgendamentoRepository";
import {
  MSG_CANCELADO,
  MSG_DOACAO_JA_CONFIRMADA,
  MSG_HORARIO_INDISPONIVEL,
  MSG_NAO_CONFIRMAVEL,
  MSG_SO_A_INSTITUICAO,
} from "../src/services/AgendamentoService";
import { definirRelogio } from "../src/utils/relogio";
import { app, comToken, criarConta, limpar } from "./helpers";
import { respostasLimpas } from "./respostas";

// RN-007 e RN-008: a instituição confirma a doação; o agendamento vira Finalizado, a pessoa ganha 100 pontos e pode subir de patente.
// Quem confirma é a instituição; hoje ela é simulada, e o app tem um botão de demonstração que faz esse papel.
// O relógio é fixado em segunda-feira, 19/10/2026, 12:00 em Brasília.

const INICIO = new Date("2026-10-19T15:00:00Z");
const MSG_PRIMEIRA = "Doação confirmada! Você ganhou 100 pontos. Parabéns, você subiu para a patente Bronze!";
const MSG_SEM_PATENTE_NOVA = "Doação confirmada! Você ganhou 100 pontos.";

let instituicao: { id: string; nome: string };
const apagarFixtures = () => prisma.instituicao.deleteMany({ where: { codigo: { startsWith: "doacao-teste-" } } });

beforeAll(async () => {
  await limpar();
  await apagarFixtures();
  instituicao = await prisma.instituicao.create({
    data: {
      codigo: "doacao-teste-1",
      nome: "Posto Doação Teste 1",
      endereco: "Rua de Teste, 1",
      cidade: "Cidade de Teste",
      uf: "DF",
      horario: "Segunda a sexta, das 8h às 17h",
      latitude: 10,
      longitude: 10,
      tiposEmFalta: [],
      demonstracao: true,
    },
  });
});
beforeEach(() => definirRelogio(() => INICIO));
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
type Horario = { medicoCodigo: string; inicio: string; status: string };

async function livres(token: string): Promise<Horario[]> {
  const resposta = await request(app).get(`/instituicoes/${instituicao.id}/agenda`).set(comToken(token));
  expect(resposta.status).toBe(200);
  return resposta.body.dias
    .flatMap((dia: any) => dia.medicos.flatMap((m: any) => m.horarios.map((h: any) => ({ medicoCodigo: m.codigo, ...h }))))
    .filter((h: Horario) => h.status === "LIVRE");
}

const agendarHorario = (token: string, h: Horario) =>
  request(app)
    .post("/doadores/me/agendamentos")
    .set(comToken(token))
    .send({ instituicaoId: instituicao.id, medicoCodigo: h.medicoCodigo, inicio: h.inicio, tipoSanguineo: "O+" });
const simular = (token: string, id: string) => request(app).post(`/doadores/me/agendamentos/${id}/simular-doacao`).set(comToken(token));
const resumo = (token: string) => request(app).get("/doadores/me/gamificacao").set(comToken(token));
const cancelar = (token: string, id: string) => request(app).delete(`/doadores/me/agendamentos/${id}`).set(comToken(token));

async function doadorLiberado() {
  const conta = await criarConta();
  const formulario = await request(app).post("/doadores/me/formulario").set(comToken(conta.token)).send({ respostas: respostasLimpas() });
  expect(formulario.status).toBe(201);
  return conta;
}

// Agenda o primeiro horário livre e já pede a confirmação da doação.
async function doar(token: string) {
  const [h] = await livres(token);
  const criado = await agendarHorario(token, h);
  expect(criado.status).toBe(201);
  const confirmado = await simular(token, criado.body.agendamento.id);
  return { horario: h, criado, confirmado };
}

// ---------------------------------------------------------------- confirmar a doação
describe("RN-007: a instituição confirma a doação", () => {
  it("o agendamento vira Finalizado, a pessoa ganha 100 pontos e a primeira doação dá a patente Bronze", async () => {
    const { token, doador } = await doadorLiberado();

    const { horario, confirmado } = await doar(token);

    expect(confirmado.status).toBe(200);
    expect(confirmado.body.mensagem).toBe(MSG_PRIMEIRA);
    expect(confirmado.body.subiuDePatente).toBe(true);
    expect(confirmado.body.agendamento).toMatchObject({
      status: "FINALIZADO",
      pontosGanhos: 100,
      finalizadoEm: INICIO.toISOString(),
      inicio: horario.inicio,
      simulado: true,
    });
    expect(confirmado.body.gamificacao).toEqual({
      pontos: 100,
      doacoes: 1,
      patente: { nivel: 1, nome: "Bronze" },
      proximaPatente: { nivel: 2, nome: "Prata", doacoesNecessarias: 3, faltam: 2 },
    });

    const linha = await prisma.agendamento.findUniqueOrThrow({ where: { id: confirmado.body.agendamento.id } });
    expect(linha).toMatchObject({ doadorId: doador.id, status: "FINALIZADO", pontosGanhos: 100, finalizadoEm: INICIO });
    // O horário usado continua reservado (só o cancelamento libera).
    expect(linha.reservaDoHorario).not.toBeNull();
  });

  it("dá para confirmar mesmo antes do horário, porque a instituição é de demonstração", async () => {
    const { token } = await doadorLiberado();
    const [h] = await livres(token);
    expect(new Date(h.inicio).getTime()).toBeGreaterThan(INICIO.getTime());
    const criado = await agendarHorario(token, h);

    const resposta = await simular(token, criado.body.agendamento.id);

    expect(resposta.status).toBe(200);
  });

  it("depois de confirmar, não há mais doação por vir e dá para agendar outra", async () => {
    const { token } = await doadorLiberado();
    await doar(token);
    expect((await request(app).get("/doadores/me/agendamentos/proximo").set(comToken(token))).body).toEqual({ agendamento: null });

    const [outro] = await livres(token);
    expect((await agendarHorario(token, outro)).status).toBe(201);
  });

  it("o horário da doação confirmada continua ocupado para os outros doadores", async () => {
    const a = await doadorLiberado();
    const b = await doadorLiberado();
    const { horario } = await doar(a.token);

    const outros = await livres(b.token);
    expect(outros.some((h) => h.medicoCodigo === horario.medicoCodigo && h.inicio === horario.inicio)).toBe(false);
    const tentativa = await agendarHorario(b.token, horario);
    expect(tentativa.status).toBe(409);
    expect(tentativa.body).toEqual({ mensagem: MSG_HORARIO_INDISPONIVEL });
  });

  it("cancelar um agendamento ainda libera o horário, mas confirmar uma doação não", async () => {
    const a = await doadorLiberado();
    const b = await doadorLiberado();
    const [h] = await livres(a.token);
    const criado = (await agendarHorario(a.token, h)).body.agendamento;
    expect((await cancelar(a.token, criado.id)).body.mensagem).toBe(MSG_CANCELADO);

    expect((await agendarHorario(b.token, h)).status).toBe(201);
  });

  it("as doações seguintes somam 100 pontos cada, e a terceira sobe para Prata", async () => {
    const { token } = await doadorLiberado();

    const primeira = await doar(token);
    const segunda = await doar(token);
    const terceira = await doar(token);

    expect(primeira.confirmado.body.mensagem).toBe(MSG_PRIMEIRA);
    // A segunda continua Bronze: sem aviso de patente nova.
    expect(segunda.confirmado.body.mensagem).toBe(MSG_SEM_PATENTE_NOVA);
    expect(segunda.confirmado.body.subiuDePatente).toBe(false);
    expect(segunda.confirmado.body.gamificacao).toMatchObject({ pontos: 200, doacoes: 2, patente: { nome: "Bronze" }, proximaPatente: { nome: "Prata", faltam: 1 } });
    // A terceira chega a Prata.
    expect(terceira.confirmado.body.mensagem).toBe("Doação confirmada! Você ganhou 100 pontos. Parabéns, você subiu para a patente Prata!");
    expect(terceira.confirmado.body.subiuDePatente).toBe(true);
    expect(terceira.confirmado.body.gamificacao).toMatchObject({ pontos: 300, doacoes: 3, patente: { nivel: 2, nome: "Prata" }, proximaPatente: { nome: "Ouro", faltam: 2 } });
  });

  it("a décima doação chega a Diamante, a maior patente: não há próxima", async () => {
    const { token, doador } = await doadorLiberado();
    // Nove doações já confirmadas (gravadas direto, para o teste não demorar) e a décima pela API.
    await prisma.agendamento.createMany({
      data: Array.from({ length: 9 }, (_, i) => ({
        doadorId: doador.id,
        instituicaoId: instituicao.id,
        medicoCodigo: "medico-antigo",
        medicoNome: "Dr. Antigo",
        medicoEspecialidade: "Hemoterapia",
        inicio: new Date(INICIO.getTime() - (i + 1) * 90 * 86_400_000),
        duracaoMin: 30,
        tipoSanguineo: "O_POSITIVO" as const,
        status: "FINALIZADO" as const,
        protocolo: `SIM-ANTIGO-${i}`,
        reservaDoHorario: null,
        finalizadoEm: new Date(INICIO.getTime() - (i + 1) * 90 * 86_400_000),
        pontosGanhos: 100,
      })),
    });

    const { confirmado } = await doar(token);

    expect(confirmado.body.gamificacao).toEqual({ pontos: 1000, doacoes: 10, patente: { nivel: 4, nome: "Diamante" }, proximaPatente: null });
    expect(confirmado.body.mensagem).toContain("patente Diamante");
  });

  it("confirmar de novo: 409 e os pontos não dobram", async () => {
    const { token } = await doadorLiberado();
    const { criado } = await doar(token);

    const outra = await simular(token, criado.body.agendamento.id);

    expect(outra.status).toBe(409);
    expect(outra.body).toEqual({ mensagem: MSG_DOACAO_JA_CONFIRMADA });
    expect((await resumo(token)).body.gamificacao).toMatchObject({ pontos: 100, doacoes: 1 });
  });

  it("dois pedidos ao mesmo tempo: só um confirma e os pontos são dados uma vez", async () => {
    const { token } = await doadorLiberado();
    const [h] = await livres(token);
    const id = (await agendarHorario(token, h)).body.agendamento.id;

    const respostas = await Promise.all([simular(token, id), simular(token, id)]);

    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await resumo(token)).body.gamificacao).toMatchObject({ pontos: 100, doacoes: 1 });
  });

  it("a trava do banco: finalizar o mesmo agendamento uma segunda vez não vale e não dá pontos", async () => {
    const { token } = await doadorLiberado();
    const [h] = await livres(token);
    const id = (await agendarHorario(token, h)).body.agendamento.id;

    // Direto no banco, como dois pedidos que passaram pela conferência do serviço ao mesmo tempo.
    const primeira = await AgendamentoRepository.finalizar(id, INICIO, 100);
    const segunda = await AgendamentoRepository.finalizar(id, INICIO, 100);

    expect(primeira).not.toBeNull();
    expect(segunda).toBeNull();
    expect((await resumo(token)).body.gamificacao).toMatchObject({ pontos: 100, doacoes: 1 });
  });

  it("um agendamento cancelado não pode ser confirmado", async () => {
    const { token } = await doadorLiberado();
    const [h] = await livres(token);
    const id = (await agendarHorario(token, h)).body.agendamento.id;
    expect((await cancelar(token, id)).status).toBe(200);

    const resposta = await simular(token, id);

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ mensagem: MSG_NAO_CONFIRMAVEL });
    expect((await resumo(token)).body.gamificacao).toMatchObject({ pontos: 0, doacoes: 0 });
  });

  it("o agendamento de outro doador: 404, e nada muda", async () => {
    const dono = await doadorLiberado();
    const outro = await doadorLiberado();
    const [h] = await livres(dono.token);
    const id = (await agendarHorario(dono.token, h)).body.agendamento.id;

    const resposta = await simular(outro.token, id);

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ mensagem: "Agendamento não encontrado." });
    expect((await prisma.agendamento.findUniqueOrThrow({ where: { id } })).status).toBe("AGENDADO");
    expect((await resumo(dono.token)).body.gamificacao).toMatchObject({ pontos: 0, doacoes: 0 });
  });

  it("id que não existe: 404; sem login: 401", async () => {
    const { token } = await doadorLiberado();

    expect((await simular(token, randomUUID())).status).toBe(404);
    expect((await request(app).post(`/doadores/me/agendamentos/${randomUUID()}/simular-doacao`)).status).toBe(401);
  });

  it("com uma instituição de verdade (não simulada) o doador não confirma a própria doação: 403", async () => {
    const { token } = await doadorLiberado();
    const [h] = await livres(token);
    const id = (await agendarHorario(token, h)).body.agendamento.id;
    definirAgenda({ simulado: false, consultar: agendaSimulada.consultar, reservar: agendaSimulada.reservar, cancelar: agendaSimulada.cancelar });

    const resposta = await simular(token, id);

    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ mensagem: MSG_SO_A_INSTITUICAO });
    expect((await prisma.agendamento.findUniqueOrThrow({ where: { id } })).status).toBe("AGENDADO");
    // O app descobre pelo agendamento que o botão de demonstração não deve aparecer.
    expect((await request(app).get("/doadores/me/agendamentos/proximo").set(comToken(token))).body.agendamento.simulado).toBe(false);
  });
});

// ---------------------------------------------------------------- pontos e patente
describe("pontos e patente do doador (RN-007 e RN-008)", () => {
  it("quem nunca doou: 0 pontos, Iniciante e falta 1 doação para Bronze", async () => {
    const { token } = await criarConta();

    const resposta = await resumo(token);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      gamificacao: { pontos: 0, doacoes: 0, patente: { nivel: 0, nome: "Iniciante" }, proximaPatente: { nivel: 1, nome: "Bronze", doacoesNecessarias: 1, faltam: 1 } },
    });
  });

  it("só doações confirmadas contam: agendada ou cancelada não dá pontos", async () => {
    const { token } = await doadorLiberado();
    const [primeiro, segundo] = await livres(token);
    const cancelada = (await agendarHorario(token, primeiro)).body.agendamento;
    expect((await cancelar(token, cancelada.id)).status).toBe(200);
    expect((await agendarHorario(token, segundo)).status).toBe(201); // fica só Agendado

    expect((await resumo(token)).body.gamificacao).toMatchObject({ pontos: 0, doacoes: 0, patente: { nome: "Iniciante" } });
  });

  it("cada doador vê só os próprios pontos", async () => {
    const a = await doadorLiberado();
    const b = await doadorLiberado();
    await doar(a.token);

    expect((await resumo(a.token)).body.gamificacao.pontos).toBe(100);
    expect((await resumo(b.token)).body.gamificacao.pontos).toBe(0);
  });

  it("a lista de agendamentos mostra a doação confirmada, com pontos e data de confirmação", async () => {
    const { token } = await doadorLiberado();
    const { confirmado } = await doar(token);

    const lista = (await request(app).get("/doadores/me/agendamentos").query({ status: "FINALIZADO" }).set(comToken(token))).body.agendamentos;

    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ id: confirmado.body.agendamento.id, status: "FINALIZADO", pontosGanhos: 100, finalizadoEm: INICIO.toISOString() });
  });

  it("o agendamento ainda não confirmado mostra pontos e confirmação em branco", async () => {
    const { token } = await doadorLiberado();
    const [h] = await livres(token);

    const criado = (await agendarHorario(token, h)).body.agendamento;

    expect(criado).toMatchObject({ status: "AGENDADO", pontosGanhos: null, finalizadoEm: null, simulado: true });
  });

  it("excluir a conta apaga as doações e os pontos", async () => {
    const { token, doador } = await doadorLiberado();
    await doar(token);

    expect((await request(app).delete("/doadores/me").set(comToken(token))).status).toBe(204);

    expect(await prisma.agendamento.count({ where: { doadorId: doador.id } })).toBe(0);
  });
});

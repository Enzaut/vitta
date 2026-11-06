import { describe, expect, it } from "vitest";
import type { Resultado } from "../src/triagem/analisar";
import {
  MSG_FORMULARIO_VENCIDO,
  MSG_SEM_FORMULARIO,
  passou,
  podeResponderEm,
  situacaoDoAgendamento,
  type SituacaoDoFormulario,
} from "../src/triagem/agendamento";

// RN-003, RN-004 e RN-005 como conta pura: o que o resultado do formulário permite em cada momento.

const HORA = 3_600_000;
const PREENCHIDO = new Date("2026-10-19T15:00:00Z"); // 12:00 em Brasília
const depoisDe = (horas: number) => new Date(PREENCHIDO.getTime() + horas * HORA);
const formulario = (resultado: Resultado, validoAte = "2026-10-26"): SituacaoDoFormulario => ({ resultado, preenchidoEm: PREENCHIDO, validoAte });

describe("a resposta do formulário é positiva ou negativa", () => {
  it("APTO e AVALIACAO passaram; INAPTO e INAPTO_TEMPORARIO não", () => {
    expect(passou("APTO")).toBe(true);
    expect(passou("AVALIACAO")).toBe(true);
    expect(passou("INAPTO")).toBe(false);
    expect(passou("INAPTO_TEMPORARIO")).toBe(false);
  });
});

describe("RN-005: quando quem não passou pode responder de novo", () => {
  it("quem passou não espera nada", () => {
    expect(podeResponderEm({ resultado: "APTO", preenchidoEm: PREENCHIDO })).toBeNull();
    expect(podeResponderEm({ resultado: "AVALIACAO", preenchidoEm: PREENCHIDO })).toBeNull();
  });

  it("quem não passou espera exatamente 3 dias (72 horas) depois de responder", () => {
    for (const resultado of ["INAPTO", "INAPTO_TEMPORARIO"] as const) {
      expect(podeResponderEm({ resultado, preenchidoEm: PREENCHIDO })?.toISOString()).toBe("2026-10-22T15:00:00.000Z");
    }
  });
});

describe("RN-004: situação do agendamento", () => {
  it("quem nunca respondeu não pode agendar", () => {
    expect(situacaoDoAgendamento(null, PREENCHIDO)).toEqual({
      codigo: "SEM_FORMULARIO",
      aprovado: false,
      vencido: false,
      agendamentoLiberado: false,
      bloqueio: MSG_SEM_FORMULARIO,
      podeResponderEm: null,
      podeResponderAgora: true,
    });
  });

  it("quem passou pode agendar durante a validade", () => {
    for (const resultado of ["APTO", "AVALIACAO"] as const) {
      expect(situacaoDoAgendamento(formulario(resultado), depoisDe(1))).toEqual({
        codigo: "LIBERADO",
        aprovado: true,
        vencido: false,
        agendamentoLiberado: true,
        bloqueio: null,
        podeResponderEm: null,
        podeResponderAgora: true,
      });
    }
  });

  it("o último dia de validade ainda vale (até a meia-noite de Brasília); depois vence", () => {
    const ultimoInstante = new Date("2026-10-27T02:59:59Z"); // 26/10 às 23:59:59 em Brasília
    const primeiroInstanteDoDiaSeguinte = new Date("2026-10-27T03:00:00Z"); // 27/10 às 00:00 em Brasília

    expect(situacaoDoAgendamento(formulario("APTO"), ultimoInstante).agendamentoLiberado).toBe(true);

    const vencido = situacaoDoAgendamento(formulario("APTO"), primeiroInstanteDoDiaSeguinte);
    expect(vencido).toMatchObject({ codigo: "VENCIDO", aprovado: true, vencido: true, agendamentoLiberado: false, bloqueio: MSG_FORMULARIO_VENCIDO });
  });

  it("quem não passou não pode agendar, mesmo dentro da validade", () => {
    const inapto = situacaoDoAgendamento(formulario("INAPTO"), depoisDe(1));

    expect(inapto).toMatchObject({ codigo: "NAO_APROVADO", aprovado: false, vencido: false, agendamentoLiberado: false, podeResponderAgora: false });
    expect(inapto.bloqueio).toContain("não é indicada para você");
    expect(inapto.bloqueio).toContain("Você poderá responder ao formulário de novo em 22/10/2026 às 12:00.");
    expect(inapto.podeResponderEm?.toISOString()).toBe("2026-10-22T15:00:00.000Z");

    const temporario = situacaoDoAgendamento(formulario("INAPTO_TEMPORARIO"), depoisDe(1));
    expect(temporario.codigo).toBe("NAO_APROVADO");
    expect(temporario.bloqueio).toBe(
      "No momento você não está apto(a) para realizar doações. Você poderá responder ao formulário de novo em 22/10/2026 às 12:00.",
    );
  });

  it("quem não passou por um impedimento com data também vê a partir de quando poderá doar", () => {
    const comData = situacaoDoAgendamento({ ...formulario("INAPTO_TEMPORARIO"), liberadoEm: "2026-10-23" }, depoisDe(1));
    expect(comData.bloqueio).toBe(
      "No momento você não está apto(a) para realizar doações. Você poderá doar a partir de 23/10/2026. Você poderá responder ao formulário de novo em 22/10/2026 às 12:00.",
    );

    // Passado o prazo de espera, a frase muda e a data de retorno continua aparecendo.
    const depoisDaEspera = situacaoDoAgendamento({ ...formulario("INAPTO_TEMPORARIO"), liberadoEm: "2026-10-23" }, depoisDe(73));
    expect(depoisDaEspera.bloqueio).toBe(
      "No momento você não está apto(a) para realizar doações. Você poderá doar a partir de 23/10/2026. Você já pode responder ao formulário de novo.",
    );

    // Sem data de retorno (a situação precisa mudar), a mensagem não inventa uma.
    expect(situacaoDoAgendamento({ ...formulario("INAPTO_TEMPORARIO"), liberadoEm: null }, depoisDe(1)).bloqueio).not.toContain("a partir de");
  });

  it("a espera de 3 dias termina em 72 horas: 1 milissegundo antes ainda barra, na hora libera", () => {
    const quase = situacaoDoAgendamento(formulario("INAPTO_TEMPORARIO"), new Date(depoisDe(72).getTime() - 1));
    expect(quase.podeResponderAgora).toBe(false);

    const naHora = situacaoDoAgendamento(formulario("INAPTO_TEMPORARIO"), depoisDe(72));
    expect(naHora.podeResponderAgora).toBe(true);
    expect(naHora.bloqueio).toContain("Você já pode responder ao formulário de novo.");
    // Poder responder de novo não libera o agendamento: só passando no formulário.
    expect(naHora).toMatchObject({ codigo: "NAO_APROVADO", agendamentoLiberado: false });
  });

  it("quem não passou e deixou o formulário vencer só precisa responder de novo", () => {
    const vencido = situacaoDoAgendamento(formulario("INAPTO"), depoisDe(24 * 8));

    expect(vencido).toMatchObject({
      codigo: "VENCIDO",
      aprovado: false,
      vencido: true,
      agendamentoLiberado: false,
      bloqueio: MSG_FORMULARIO_VENCIDO,
      podeResponderAgora: true,
    });
  });
});

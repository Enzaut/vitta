import { describe, expect, it } from "vitest";
import {
  dataValida,
  descreverPrazo,
  formatarBr,
  hojeNoBrasil,
  idadeEm,
  somarDias,
  somarMeses,
  somarPrazo,
} from "../src/triagem/datas";

// Contas de data da triagem: a base de todos os prazos da Portaria.

describe("datas da triagem", () => {
  it("só aceita datas que existem no calendário", () => {
    expect(dataValida("2026-10-19")).toBe(true);
    expect(dataValida("2024-02-29")).toBe(true);
    expect(dataValida("2026-02-29")).toBe(false);
    expect(dataValida("2026-02-30")).toBe(false);
    expect(dataValida("2026-13-01")).toBe(false);
    expect(dataValida("19/10/2026")).toBe(false);
    expect(dataValida(20261019)).toBe(false);
    expect(dataValida(null)).toBe(false);
  });

  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-10-19", 7)).toBe("2026-10-26");
    expect(somarDias("2026-10-28", 7)).toBe("2026-11-04");
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(somarDias("2026-10-19", -19)).toBe("2026-09-30");
  });

  it("soma meses mantendo o dia do mês", () => {
    expect(somarMeses("2026-06-15", 4)).toBe("2026-10-15");
    expect(somarMeses("2026-10-19", 12)).toBe("2027-10-19");
    expect(somarMeses("2026-11-20", 4)).toBe("2027-03-20");
    expect(somarMeses("2026-10-19", -4)).toBe("2026-06-19");
  });

  it("se o dia não existe no mês de destino, vale o último dia do mês", () => {
    expect(somarMeses("2026-10-31", 4)).toBe("2027-02-28");
    expect(somarMeses("2023-10-31", 4)).toBe("2024-02-29"); // ano bissexto
    expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(somarMeses("2024-02-29", 12)).toBe("2025-02-28");
  });

  it("soma prazos compostos (anos, meses e dias)", () => {
    expect(somarPrazo("2026-10-19", { dias: 14 })).toBe("2026-11-02");
    expect(somarPrazo("2026-10-19", { meses: 4 })).toBe("2027-02-19");
    expect(somarPrazo("2026-10-19", { anos: 3 })).toBe("2029-10-19");
    expect(somarPrazo("2026-10-19", { anos: 1, meses: 1, dias: 1 })).toBe("2027-11-20");
  });

  it("calcula a idade em anos completos (o aniversário já vale no dia)", () => {
    expect(idadeEm("2010-10-19", "2026-10-19")).toBe(16);
    expect(idadeEm("2010-10-20", "2026-10-19")).toBe(15);
    expect(idadeEm("1995-03-15", "2026-10-19")).toBe(31);
    expect(idadeEm("1956-10-19", "2026-10-19")).toBe(70);
    expect(idadeEm("1956-10-20", "2026-10-19")).toBe(69);
  });

  it("formata como dia/mês/ano", () => {
    expect(formatarBr("2026-10-05")).toBe("05/10/2026");
  });

  it("usa a data de Brasília, mesmo quando em Londres já virou o dia", () => {
    // 02:00 UTC = 23:00 em Brasília (dia anterior); 03:00 UTC = meia-noite em Brasília.
    expect(hojeNoBrasil(new Date("2026-10-20T02:00:00Z"))).toBe("2026-10-19");
    expect(hojeNoBrasil(new Date("2026-10-20T03:00:00Z"))).toBe("2026-10-20");
    expect(hojeNoBrasil(new Date("2026-10-19T15:30:00Z"))).toBe("2026-10-19");
  });

  it("descreve o prazo em português", () => {
    expect(descreverPrazo({ dias: 1 })).toBe("1 dia");
    expect(descreverPrazo({ dias: 14 })).toBe("14 dias");
    expect(descreverPrazo({ meses: 1 })).toBe("1 mês");
    expect(descreverPrazo({ meses: 4 })).toBe("4 meses");
    expect(descreverPrazo({ anos: 3 })).toBe("3 anos");
    expect(descreverPrazo({ anos: 1, meses: 6 })).toBe("1 ano e 6 meses");
  });
});

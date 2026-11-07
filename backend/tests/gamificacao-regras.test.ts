import { describe, expect, it } from "vitest";
import { PATENTES, PONTOS_POR_DOACAO, calcularProgresso } from "../src/gamificacao/regras";
import { resumoParaDoacoes } from "../src/services/GamificacaoService";

// RN-007 (pontos) e RN-008 (patentes). Os números são uma proposta do projeto: os requisitos não os definem.

describe("pontos (RN-007)", () => {
  it("cada doação confirmada dá 100 pontos", () => {
    expect(PONTOS_POR_DOACAO).toBe(100);
  });
});

describe("patentes (RN-008)", () => {
  it.each([
    [0, "Iniciante"],
    [1, "Bronze"],
    [2, "Bronze"],
    [3, "Prata"],
    [4, "Prata"],
    [5, "Ouro"],
    [9, "Ouro"],
    [10, "Diamante"],
    [11, "Diamante"],
    [200, "Diamante"],
  ])("%i doações confirmadas: patente %s", (doacoes, nome) => {
    expect(calcularProgresso(doacoes).patente.nome).toBe(nome);
  });

  it("diz qual é a próxima patente e quantas doações faltam", () => {
    expect(calcularProgresso(0).proxima).toMatchObject({ nome: "Bronze", faltam: 1 });
    expect(calcularProgresso(1).proxima).toMatchObject({ nome: "Prata", faltam: 2 });
    expect(calcularProgresso(2).proxima).toMatchObject({ nome: "Prata", faltam: 1 });
    expect(calcularProgresso(4).proxima).toMatchObject({ nome: "Ouro", faltam: 1 });
    expect(calcularProgresso(5).proxima).toMatchObject({ nome: "Diamante", faltam: 5 });
    expect(calcularProgresso(9).proxima).toMatchObject({ nome: "Diamante", faltam: 1 });
  });

  it("na maior patente não há próxima", () => {
    expect(calcularProgresso(10).proxima).toBeNull();
    expect(calcularProgresso(40).proxima).toBeNull();
  });

  it("a lista de patentes começa no zero e cresce: níveis em ordem e cada patente pede mais doações que a anterior", () => {
    expect(PATENTES[0].doacoesNecessarias).toBe(0);
    PATENTES.forEach((patente, indice) => {
      expect(patente.nivel).toBe(indice);
      if (indice > 0) expect(patente.doacoesNecessarias).toBeGreaterThan(PATENTES[indice - 1].doacoesNecessarias);
    });
    expect(PATENTES.map((p) => p.nome)).toEqual(["Iniciante", "Bronze", "Prata", "Ouro", "Diamante"]);
  });
});

describe("resumo para a API", () => {
  it("junta pontos, doações, patente atual e a próxima", () => {
    expect(resumoParaDoacoes(3, 300)).toEqual({
      pontos: 300,
      doacoes: 3,
      patente: { nivel: 2, nome: "Prata" },
      proximaPatente: { nivel: 3, nome: "Ouro", doacoesNecessarias: 5, faltam: 2 },
    });
  });

  it("quem nunca doou começa Iniciante, com 0 pontos", () => {
    expect(resumoParaDoacoes(0, 0)).toEqual({
      pontos: 0,
      doacoes: 0,
      patente: { nivel: 0, nome: "Iniciante" },
      proximaPatente: { nivel: 1, nome: "Bronze", doacoesNecessarias: 1, faltam: 1 },
    });
  });

  it("na maior patente, a próxima é nula", () => {
    expect(resumoParaDoacoes(12, 1200).proximaPatente).toBeNull();
  });
});

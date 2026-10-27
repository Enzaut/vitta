import { describe, expect, it } from "vitest";
import { INSTITUICOES, INSTITUICOES_DEMONSTRACAO, INSTITUICOES_REAIS } from "../prisma/dados/instituicoes";
import { TIPOS_SANGUINEOS } from "../src/utils/tipoSanguineo";

// Confere os dados iniciais do mapa (prisma/dados/instituicoes.ts): erro de digitação aqui
// (latitude trocada, telefone torto, tipo sanguíneo inexistente) apareceria no mapa do doador.

// Caixa que contém o Distrito Federal (com folga).
const DF = { latMin: -16.1, latMax: -15.45, lngMin: -48.3, lngMax: -47.2 };

describe("dados iniciais das instituições", () => {
  it("existe ao menos uma instituição real e algumas de demonstração", () => {
    expect(INSTITUICOES_REAIS.length).toBeGreaterThanOrEqual(1);
    expect(INSTITUICOES_DEMONSTRACAO.length).toBeGreaterThanOrEqual(3);
    expect(INSTITUICOES).toHaveLength(INSTITUICOES_REAIS.length + INSTITUICOES_DEMONSTRACAO.length);
  });

  it("os códigos são únicos e escritos em minúsculas, sem espaço", () => {
    const codigos = INSTITUICOES.map((i) => i.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
    for (const codigo of codigos) expect(codigo).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("nenhum código começa com “teste-” (esse prefixo é dos testes automáticos)", () => {
    for (const i of INSTITUICOES) expect(i.codigo.startsWith("teste-")).toBe(false);
  });

  it("nome, endereço, cidade e horário estão preenchidos e a UF tem 2 letras", () => {
    for (const i of INSTITUICOES) {
      expect(i.nome.trim(), i.codigo).not.toBe("");
      expect(i.endereco.trim(), i.codigo).not.toBe("");
      expect(i.cidade.trim(), i.codigo).not.toBe("");
      expect(i.horario.trim(), i.codigo).not.toBe("");
      expect(i.uf, i.codigo).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("as coordenadas ficam dentro do Distrito Federal", () => {
    for (const i of INSTITUICOES) {
      expect(i.latitude, `${i.codigo} latitude`).toBeGreaterThan(DF.latMin);
      expect(i.latitude, `${i.codigo} latitude`).toBeLessThan(DF.latMax);
      expect(i.longitude, `${i.codigo} longitude`).toBeGreaterThan(DF.lngMin);
      expect(i.longitude, `${i.codigo} longitude`).toBeLessThan(DF.lngMax);
    }
  });

  it("não há duas instituições no mesmo ponto do mapa", () => {
    const pontos = INSTITUICOES.map((i) => `${i.latitude.toFixed(4)},${i.longitude.toFixed(4)}`);
    expect(new Set(pontos).size).toBe(pontos.length);
  });

  it("telefone, quando existe, tem o formato (61) 3327-4413 ou (61) 99999-9999", () => {
    for (const i of INSTITUICOES) {
      if (i.telefone !== null) expect(i.telefone, i.codigo).toMatch(/^\(\d{2}\) \d{4,5}-\d{4}$/);
    }
  });

  it("os tipos sanguíneos em falta são dos 8 tipos e não se repetem", () => {
    for (const i of INSTITUICOES) {
      for (const tipo of i.tiposEmFalta) expect(TIPOS_SANGUINEOS as readonly string[], i.codigo).toContain(tipo);
      expect(new Set(i.tiposEmFalta).size, i.codigo).toBe(i.tiposEmFalta.length);
    }
  });

  it("a data do estoque, quando existe, é uma data válida AAAA-MM-DD", () => {
    for (const i of INSTITUICOES) {
      if (i.estoqueAtualizadoEm === null) continue;
      expect(i.estoqueAtualizadoEm, i.codigo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(i.estoqueAtualizadoEm)), i.codigo).toBe(false);
    }
  });

  describe("instituições reais", () => {
    it("trazem a fonte dos dados e não inventam estoque", () => {
      for (const i of INSTITUICOES_REAIS) {
        expect(i.demonstracao, i.codigo).toBe(false);
        expect(i.fonte, i.codigo).toMatch(/^https:\/\//);
        expect(i.tiposEmFalta, i.codigo).toEqual([]);
        expect(i.estoqueAtualizadoEm, i.codigo).toBeNull();
      }
    });

    it("o Hemocentro de Brasília está na lista", () => {
      const hemocentro = INSTITUICOES_REAIS.find((i) => i.codigo === "hemocentro-de-brasilia");
      expect(hemocentro).toBeDefined();
      expect(hemocentro!.endereco).toContain("Asa Norte");
      expect(hemocentro!.fonte).toContain("fhb.df.gov.br");
    });
  });

  describe("instituições de demonstração", () => {
    it("têm “demonstração” no nome e no endereço, e não têm fonte nem telefone", () => {
      for (const i of INSTITUICOES_DEMONSTRACAO) {
        expect(i.demonstracao, i.codigo).toBe(true);
        expect(i.codigo.startsWith("demo-"), i.codigo).toBe(true);
        expect(i.nome.toLowerCase(), i.codigo).toContain("demonstração");
        expect(i.endereco.toLowerCase(), i.codigo).toContain("demonstração");
        expect(i.fonte, i.codigo).toBeNull();
        expect(i.telefone, i.codigo).toBeNull();
      }
    });
  });
});

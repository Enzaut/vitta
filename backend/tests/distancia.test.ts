import { describe, expect, it } from "vitest";
import { KM_POR_GRAU_DE_LATITUDE, distanciaKm } from "../src/utils/distancia";
import { normalizarParaBusca } from "../src/utils/texto";

// HU-05 / RN07: a distância até as instituições é a base de "mais próximas" e do raio de busca.

describe("distanciaKm (Haversine)", () => {
  const brasilia = { latitude: -15.7939, longitude: -47.8828 };
  const saoPaulo = { latitude: -23.5505, longitude: -46.6333 };

  it("do ponto até ele mesmo é zero", () => {
    expect(distanciaKm(brasilia, brasilia)).toBe(0);
  });

  it("vale nos dois sentidos", () => {
    expect(distanciaKm(brasilia, saoPaulo)).toBeCloseTo(distanciaKm(saoPaulo, brasilia), 9);
  });

  it("1 grau de latitude tem cerca de 111,19 km", () => {
    const d = distanciaKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(d).toBeCloseTo(111.195, 2);
    expect(KM_POR_GRAU_DE_LATITUDE).toBeCloseTo(111.195, 2);
  });

  it("1 grau de longitude encolhe longe do equador (60° de latitude: cerca de 55,6 km)", () => {
    const noEquador = distanciaKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    const aSessenta = distanciaKm({ latitude: 60, longitude: 0 }, { latitude: 60, longitude: 1 });
    expect(noEquador).toBeCloseTo(111.195, 2);
    expect(aSessenta).toBeCloseTo(55.6, 1);
  });

  it("Brasília a São Paulo: cerca de 870 km em linha reta", () => {
    const d = distanciaKm(brasilia, saoPaulo);
    expect(d).toBeGreaterThan(860);
    expect(d).toBeLessThan(880);
  });

  it("dois pontos distantes meio mundo (antípodas): cerca de 20.015 km, sem dar erro", () => {
    const d = distanciaKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 });
    expect(d).toBeCloseTo(20015.1, 0);
  });

  it("andar N km para o norte dá exatamente N km (base dos testes de raio)", () => {
    const origem = { latitude: 10, longitude: 10 };
    for (const km of [0.5, 5, 19.9, 100]) {
      const destino = { latitude: origem.latitude + km / KM_POR_GRAU_DE_LATITUDE, longitude: origem.longitude };
      expect(distanciaKm(origem, destino)).toBeCloseTo(km, 6);
    }
  });
});

describe("normalizarParaBusca", () => {
  it("tira acentos, maiúsculas e espaços sobrando", () => {
    expect(normalizarParaBusca("  Hemocentro   de BRASÍLIA ")).toBe("hemocentro de brasilia");
    expect(normalizarParaBusca("São João da Ceilândia")).toBe("sao joao da ceilandia");
  });

  it("texto vazio continua vazio", () => {
    expect(normalizarParaBusca("   ")).toBe("");
  });
});

import type { Respostas } from "../src/triagem/modelo";

// Respostas de uma pessoa sem nenhum impedimento: o ponto de partida dos testes do formulário (HU-03).
// Cada teste muda só o que importa para ele, passando "extra".
export function respostasLimpas(extra: Respostas = {}): Respostas {
  return {
    bemHoje: true,
    gripe: false,
    sinaisAlerta: false,
    peso: 70,
    sexo: "F",
    jaDoou: false,
    procedimentos: {},
    piercingBocaGenital: "nao",
    remedios: {},
    vacinas: {},
    cirurgias: {},
    dentista: {},
    transfusao: false,
    condicoes: {},
    ist: false,
    riscoSexual: {},
    drogas: {},
    malaria: false,
    gestacao: {},
    declaracao: true,
    ...extra,
  };
}

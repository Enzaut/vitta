import { describe, expect, it } from "vitest";
import { AppError } from "../src/errors/AppError";
import { MODELO, VALIDADE_DIAS, VERSAO_REGRAS, condicaoAtendida, type Campo, type Condicao } from "../src/triagem/modelo";
import {
  CIRURGIAS,
  CONDICOES,
  DENTISTA,
  DROGAS,
  GESTACAO,
  PROCEDIMENTOS,
  REMEDIOS,
  RISCO_SEXUAL,
  VACINAS,
} from "../src/triagem/regras";
import { MSG_OBRIGATORIAS, validarRespostas } from "../src/triagem/validarRespostas";
import { respostasLimpas } from "./respostas";

// O modelo (perguntas) e as regras (prazos) vivem em arquivos separados.
// Estes testes garantem que um não fique sem o outro: toda opção tem regra e toda regra tem opção.

const todosOsCampos = (): Campo[] => MODELO.blocos.flatMap((b) => b.campos);
const multipla = (id: string) => {
  const campo = todosOsCampos().find((c) => c.id === id);
  if (!campo || campo.tipo !== "multipla") throw new Error(`pergunta ${id} não é de marcar várias`);
  return campo;
};
const idsDasOpcoes = (id: string) => multipla(id).opcoes.map((o) => o.id).sort();

describe("modelo do formulário: estrutura", () => {
  it("tem versão das regras (data) e validade em dias", () => {
    expect(VERSAO_REGRAS).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(MODELO.versaoRegras).toBe(VERSAO_REGRAS);
    expect(MODELO.validadeDias).toBe(VALIDADE_DIAS);
    expect(VALIDADE_DIAS).toBe(30);
  });

  it("os ids das perguntas não se repetem", () => {
    const ids = todosOsCampos().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("dentro de cada opção, os ids dos campos não se repetem", () => {
    for (const campo of todosOsCampos()) {
      if (campo.tipo !== "multipla") continue;
      for (const opcao of campo.opcoes) {
        const ids = (opcao.campos ?? []).map((c) => c.id);
        expect(new Set(ids).size, `${campo.id}.${opcao.id}`).toBe(ids.length);
      }
      const opcoes = campo.opcoes.map((o) => o.id);
      expect(new Set(opcoes).size, campo.id).toBe(opcoes.length);
    }
  });

  it("toda condição aponta para uma pergunta que vem antes dela", () => {
    const referencias = (condicao: Condicao | undefined): string[] =>
      !condicao ? [] : "e" in condicao ? condicao.e.flatMap(referencias) : [condicao.id];

    const vistos = new Set<string>();
    for (const bloco of MODELO.blocos) {
      for (const ref of referencias(bloco.quando)) expect(vistos.has(ref), `bloco ${bloco.id} usa ${ref}`).toBe(true);
      for (const campo of bloco.campos) {
        for (const ref of referencias(campo.quando)) expect(vistos.has(ref), `${campo.id} usa ${ref}`).toBe(true);
        if (campo.tipo === "multipla") {
          for (const opcao of campo.opcoes) {
            const irmaos = new Set<string>();
            for (const sub of opcao.campos ?? []) {
              for (const ref of referencias(sub.quando)) expect(irmaos.has(ref), `${campo.id}.${opcao.id}.${sub.id} usa ${ref}`).toBe(true);
              irmaos.add(sub.id);
            }
          }
        }
        vistos.add(campo.id);
      }
    }
  });

  it("pergunta de escolha tem ao menos duas opções e o modelo vira JSON sem perder nada", () => {
    for (const campo of todosOsCampos()) {
      if (campo.tipo === "escolha") expect(campo.opcoes.length, campo.id).toBeGreaterThanOrEqual(2);
    }
    expect(JSON.parse(JSON.stringify(MODELO))).toEqual(MODELO);
  });

  it("o texto de cada pergunta e opção não está vazio", () => {
    for (const campo of todosOsCampos()) {
      expect(campo.rotulo.trim(), campo.id).not.toBe("");
      if (campo.tipo === "multipla") {
        for (const opcao of campo.opcoes) expect(opcao.rotulo.trim(), `${campo.id}.${opcao.id}`).not.toBe("");
      }
    }
  });
});

describe("modelo x regras: toda opção tem regra e toda regra tem opção", () => {
  const confere = (pergunta: string, tabela: Record<string, unknown>, tratadasAParte: string[] = []) => {
    const doModelo = idsDasOpcoes(pergunta);
    const dasRegras = [...Object.keys(tabela), ...tratadasAParte].sort();
    expect(doModelo).toEqual(dasRegras);
  };

  it("remédios", () => confere("remedios", REMEDIOS));
  it("vacinas (a antirrábica é tratada à parte)", () => confere("vacinas", VACINAS, ["antirrabica"]));
  it("cirurgias (olho e pele valem depois da alta ou da cicatrização)", () => confere("cirurgias", CIRURGIAS, ["olho", "pele"]));
  it("dentista", () => confere("dentista", DENTISTA));
  it("doenças e condições (o câncer é tratado à parte)", () => confere("condicoes", CONDICOES, ["cancer"]));
  it("situações de risco", () => confere("riscoSexual", RISCO_SEXUAL));
  it("drogas (a maconha é tratada à parte)", () => confere("drogas", DROGAS, ["maconha"]));
  it("gestação e amamentação", () => confere("gestacao", GESTACAO));
  it("procedimentos estéticos", () => confere("procedimentos", PROCEDIMENTOS));

  it("toda opção com prazo tem o campo de data (ou de situação e data) que a conta lê", () => {
    const comPrazo: Array<[string, Record<string, unknown>]> = [
      ["remedios", REMEDIOS],
      ["vacinas", VACINAS],
      ["cirurgias", CIRURGIAS],
      ["dentista", DENTISTA],
      ["riscoSexual", RISCO_SEXUAL],
      ["drogas", DROGAS],
      ["gestacao", GESTACAO],
    ];
    for (const [pergunta, tabela] of comPrazo) {
      for (const opcao of multipla(pergunta).opcoes) {
        const regra = tabela[opcao.id] as { prazo?: unknown } | undefined;
        if (!regra?.prazo) continue;
        const campos = (opcao.campos ?? []).map((c) => c.id);
        expect(campos, `${pergunta}.${opcao.id}`).toContain("data");
      }
    }
  });

  it("as perguntas de data e de sim/não que a conta usa existem no modelo", () => {
    const ids = new Set(todosOsCampos().map((c) => c.id));
    for (const id of [
      "bemHoje", "gripe", "gripeFebre", "gripeSituacao", "gripeFim", "sinaisAlerta", "peso", "sexo", "jaDoou", "ultimaDoacao",
      "piercingBocaGenital", "piercingRetirada", "transfusao", "transfusaoData", "ist", "istSituacao", "istCura", "malaria", "malariaData", "declaracao",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });
});

describe("condicaoAtendida", () => {
  it("compara com a resposta da outra pergunta", () => {
    expect(condicaoAtendida(undefined, {})).toBe(true);
    expect(condicaoAtendida({ id: "a", igual: true }, { a: true })).toBe(true);
    expect(condicaoAtendida({ id: "a", igual: true }, { a: false })).toBe(false);
    expect(condicaoAtendida({ id: "a", igual: true }, {})).toBe(false); // sem resposta nunca é igual
    expect(condicaoAtendida({ id: "a", diferente: "M" }, { a: "F" })).toBe(true);
    expect(condicaoAtendida({ id: "a", diferente: "M" }, { a: "M" })).toBe(false);
    expect(condicaoAtendida({ e: [{ id: "a", igual: 1 }, { id: "b", igual: 2 }] }, { a: 1, b: 2 })).toBe(true);
    expect(condicaoAtendida({ e: [{ id: "a", igual: 1 }, { id: "b", igual: 2 }] }, { a: 1, b: 3 })).toBe(false);
  });
});

// ------------------------------------------------------------------------------------------------
describe("validação das respostas", () => {
  const ctx = { nascimento: "1995-03-15", hoje: "2026-10-19" };

  const completas = respostasLimpas;

  const erroDe = (brutas: unknown): AppError => {
    try {
      validarRespostas(MODELO, brutas, ctx);
    } catch (erro) {
      if (erro instanceof AppError) return erro;
      throw erro;
    }
    throw new Error("era esperado um erro de validação");
  };

  it("aceita um formulário completo e devolve as respostas", () => {
    const validas = validarRespostas(MODELO, completas(), ctx);
    expect(validas).toEqual(completas());
  });

  it("deixa a pessoa marcar várias opções, cada uma com os seus campos", () => {
    const entrada = completas({
      remedios: { antibiotico: { situacao: "parou", data: "2026-10-01" }, insulina: {} },
      procedimentos: { tatuagem: { data: "2026-10-10", seguro: "sim" } },
      condicoes: { cancer: { tipo: "outro", situacao: "terminou", fim: "2018-05-02" } },
    });
    expect(validarRespostas(MODELO, entrada, ctx)).toEqual(entrada);
  });

  describe("pergunta obrigatória sem resposta (HU-03, cenário 4)", () => {
    it("recusa com a mensagem do documento e marca a pergunta", () => {
      const { bemHoje: _, ...semResposta } = completas();
      const erro = erroDe(semResposta);
      expect(erro.status).toBe(400);
      expect(erro.message).toBe("Responda todas as perguntas obrigatórias para continuar.");
      expect(erro.message).toBe(MSG_OBRIGATORIAS);
      expect(erro.campos).toEqual({ bemHoje: "Esta pergunta é obrigatória." });
    });

    it("marca todas as perguntas que faltam de uma vez", () => {
      const erro = erroDe({ bemHoje: true });
      expect(Object.keys(erro.campos!)).toEqual(
        expect.arrayContaining(["gripe", "sinaisAlerta", "peso", "sexo", "jaDoou", "procedimentos", "remedios", "declaracao"]),
      );
    });

    it("formulário vazio ou sem corpo também é recusado", () => {
      expect(erroDe({}).message).toBe(MSG_OBRIGATORIAS);
      expect(erroDe(undefined).message).toBe(MSG_OBRIGATORIAS);
      expect(erroDe(null).message).toBe(MSG_OBRIGATORIAS);
      expect(erroDe("texto").message).toBe(MSG_OBRIGATORIAS);
    });

    it("pergunta de marcar várias sem resposta (nem “nenhuma”) é obrigatória; objeto vazio vale como “nenhuma”", () => {
      const { remedios: _, ...semRemedios } = completas();
      expect(erroDe(semRemedios).campos).toEqual({ remedios: "Esta pergunta é obrigatória." });
      expect(() => validarRespostas(MODELO, completas({ remedios: {} }), ctx)).not.toThrow();
    });

    it("campo de uma opção marcada também é obrigatório (ex.: o local da tatuagem era seguro?)", () => {
      const erro = erroDe(completas({ procedimentos: { tatuagem: { data: "2026-10-10" } } }));
      expect(erro.campos).toEqual({ "procedimentos.tatuagem.seguro": "Esta pergunta é obrigatória." });
    });

    it("a declaração precisa estar marcada (e conta como pergunta obrigatória na mensagem geral)", () => {
      const erro = erroDe(completas({ declaracao: false }));
      expect(erro.campos).toEqual({ declaracao: "Marque para confirmar e enviar." });
      expect(erro.message).toBe(MSG_OBRIGATORIAS);
    });
  });

  describe("perguntas que só aparecem em certos casos", () => {
    it("a data do fim da gripe é obrigatória só para quem teve gripe e os sintomas acabaram", () => {
      const erro = erroDe(completas({ gripe: true, gripeFebre: false, gripeSituacao: "acabou" }));
      expect(erro.campos).toEqual({ gripeFim: "Esta pergunta é obrigatória." });
      expect(() => validarRespostas(MODELO, completas({ gripe: true, gripeFebre: false, gripeSituacao: "ainda" }), ctx)).not.toThrow();
    });

    it("resposta de pergunta que não aparece é descartada", () => {
      const validas = validarRespostas(MODELO, completas({ gripe: false, gripeFebre: true, gripeSituacao: "ainda", gripeFim: "2026-10-01", ultimaDoacao: "2026-01-01" }), ctx);
      expect(validas).not.toHaveProperty("gripeFebre");
      expect(validas).not.toHaveProperty("gripeSituacao");
      expect(validas).not.toHaveProperty("gripeFim");
      expect(validas).not.toHaveProperty("ultimaDoacao");
    });

    it("o bloco de gestação só vale para quem não informou sexo masculino", () => {
      const { gestacao: _, ...semGestacao } = completas();
      expect(erroDe(semGestacao).campos).toEqual({ gestacao: "Esta pergunta é obrigatória." }); // sexo F
      expect(validarRespostas(MODELO, { ...semGestacao, sexo: "M" }, ctx)).not.toHaveProperty("gestacao");
      expect(validarRespostas(MODELO, { ...semGestacao, sexo: "M", gestacao: { gravida: {} } }, ctx)).not.toHaveProperty("gestacao");
      expect(() => validarRespostas(MODELO, { ...semGestacao, sexo: "N", gestacao: {} }, ctx)).not.toThrow();
    });

    it("câncer: a pergunta do tratamento só aparece para “outro tipo”", () => {
      expect(() => validarRespostas(MODELO, completas({ condicoes: { cancer: { tipo: "leve" } } }), ctx)).not.toThrow();
      expect(erroDe(completas({ condicoes: { cancer: { tipo: "outro" } } })).campos).toEqual({
        "condicoes.cancer.situacao": "Esta pergunta é obrigatória.",
      });
    });
  });

  describe("valores inválidos", () => {
    it.each([
      ["data impossível", "2026-02-30", "Informe uma data válida."],
      ["data em outro formato", "19/10/2026", "Informe uma data válida."],
      ["data no futuro", "2026-10-20", "Informe uma data válida, que não esteja no futuro."],
      ["data antes do nascimento", "1990-01-01", "A data não pode ser anterior ao seu nascimento."],
    ])("%s", (_nome, valor, mensagem) => {
      const erro = erroDe(completas({ transfusao: true, transfusaoData: valor }));
      expect(erro.campos).toEqual({ transfusaoData: mensagem });
    });

    it("a data de hoje é aceita", () => {
      expect(() => validarRespostas(MODELO, completas({ transfusao: true, transfusaoData: "2026-10-19" }), ctx)).not.toThrow();
    });

    it.each([19, 301, 70.55, "70", NaN, Infinity, true])("peso %s é recusado", (peso) => {
      expect(erroDe(completas({ peso })).campos).toHaveProperty("peso");
    });

    it.each([20, 49.9, 300])("peso %s é aceito", (peso) => {
      expect(() => validarRespostas(MODELO, completas({ peso }), ctx)).not.toThrow();
    });

    it("sim/não precisa ser verdadeiro ou falso de verdade", () => {
      expect(erroDe(completas({ bemHoje: "sim" })).campos).toEqual({ bemHoje: "Responda sim ou não." });
      expect(erroDe(completas({ bemHoje: 1 })).campos).toEqual({ bemHoje: "Responda sim ou não." });
    });

    it("escolha fora das opções é recusada", () => {
      expect(erroDe(completas({ sexo: "X" })).campos).toEqual({ sexo: "Escolha uma das opções." });
      expect(erroDe(completas({ piercingBocaGenital: ["nao"] })).campos).toEqual({ piercingBocaGenital: "Escolha uma das opções." });
    });

    it("opção que não existe em pergunta de marcar várias é recusada", () => {
      expect(erroDe(completas({ remedios: { remedioInventado: {} } })).campos).toEqual({ remedios: "Opção inválida." });
    });

    it("pergunta de marcar várias não aceita lista nem texto", () => {
      expect(erroDe(completas({ remedios: ["antibiotico"] })).campos).toHaveProperty("remedios");
      expect(erroDe(completas({ remedios: "nenhum" })).campos).toHaveProperty("remedios");
    });

    it("mensagem geral é a das respostas destacadas quando nada falta, só está errado", () => {
      expect(erroDe(completas({ peso: 5 })).message).toBe("Confira as respostas destacadas.");
    });
  });

  it("ignora perguntas que o modelo não conhece", () => {
    const validas = validarRespostas(MODELO, completas({ campoInventado: "x", cpf: "123" }), ctx);
    expect(validas).not.toHaveProperty("campoInventado");
    expect(validas).not.toHaveProperty("cpf");
  });
});

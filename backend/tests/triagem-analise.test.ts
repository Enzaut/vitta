import { describe, expect, it } from "vitest";
import { analisar, type Analise } from "../src/triagem/analisar";
import { somarDias, somarMeses, somarPrazo, type DataISO, type Prazo } from "../src/triagem/datas";
import type { Respostas } from "../src/triagem/modelo";
import { respostasLimpas } from "./respostas";

// HU-03 / E2-2: testes nos valores-limite das regras da Portaria 11.685/2026.
// "Passa" = o dia em que o impedimento já acabou. "Barra" = o dia anterior.

const HOJE = "2026-10-19";
const NASCIMENTO = "1995-03-15"; // 31 anos em HOJE

// Respostas de uma pessoa sem nenhum impedimento (ver tests/respostas.ts).
const limpas = respostasLimpas;

const rodar = (extra: Respostas = {}, nascimento: DataISO = NASCIMENTO): Analise => analisar(limpas(extra), { nascimento, hoje: HOJE });

// Nascimento de quem faz exatamente "anos" anos em HOJE (diasAntes > 0: ainda falta esse tanto para o aniversário).
const nascidoComIdade = (anos: number, diasAntes = 0): DataISO => somarDias(somarMeses(HOJE, -12 * anos), diasAntes);

const diasAtras = (n: number): DataISO => somarDias(HOJE, -n);
const mesesAtras = (n: number): DataISO => somarMeses(HOJE, -n);
// A data em que um prazo, contado a partir de "base", acaba. "Passa" = base tal que o prazo termina HOJE; "barra" = um dia depois.
const baseQueVenceHoje = (prazo: Prazo): DataISO => {
  // procura, voltando no tempo, a data cujo prazo termina exatamente hoje
  for (let d = 0; d < 6 * 366 + 5; d++) {
    const candidata = somarDias(HOJE, -d);
    if (somarPrazo(candidata, prazo) === HOJE) return candidata;
  }
  throw new Error("sem base para o prazo");
};
const baseUmDiaAntesDeVencer = (prazo: Prazo): DataISO => somarDias(baseQueVenceHoje(prazo), 1);

// Atalhos para conferir resultados.
const codigos = (a: Analise) => a.motivos.map((m) => m.codigo);

describe("resultado base", () => {
  it("quem não tem impedimento é APTO, sem motivos, com a dica do dia da doação", () => {
    const a = rodar();
    expect(a.resultado).toBe("APTO");
    expect(a.liberadoEm).toBeNull();
    expect(a.motivos).toEqual([]);
    expect(a.mensagem).toContain("você pode agendar");
    expect(a.mensagem).toContain("A decisão final é da triagem");
    expect(a.avisos.at(-1)).toMatch(/No dia da doação/);
  });
});

describe("idade (Art. 39): 15, 16, 60, 61, 69 e 70 anos", () => {
  it("15 anos (um dia antes de completar 16): inapto por idade, com o dia do aniversário", () => {
    const a = rodar({}, nascidoComIdade(16, 1));
    expect(a.resultado).toBe("INAPTO");
    expect(codigos(a)).toEqual(["idade.minima"]);
    expect(a.motivos[0]!.mensagem).toContain("pelo menos 16 anos");
    expect(a.motivos[0]!.mensagem).toContain("20/10/2026");
  });

  it("16 anos completos hoje: pode, e recebe o aviso da autorização do responsável", () => {
    const a = rodar({}, nascidoComIdade(16));
    expect(a.resultado).toBe("APTO");
    expect(a.avisos.join(" ")).toContain("autorização escrita do responsável");
  });

  it("17 anos: aviso de autorização; 18 anos: sem o aviso", () => {
    expect(rodar({}, nascidoComIdade(17)).avisos.join(" ")).toContain("autorização");
    expect(rodar({}, nascidoComIdade(18)).avisos.join(" ")).not.toContain("autorização");
  });

  it("até 60 anos a primeira doação segue; com 61 a 69 anos sem doação anterior vai para avaliação", () => {
    expect(rodar({ jaDoou: false }, nascidoComIdade(60)).resultado).toBe("APTO");
    const sessentaEUm = rodar({ jaDoou: false }, nascidoComIdade(61));
    expect(sessentaEUm.resultado).toBe("AVALIACAO");
    expect(codigos(sessentaEUm)).toEqual(["idade.primeiraDoacao"]);
    expect(rodar({ jaDoou: false }, nascidoComIdade(69)).resultado).toBe("AVALIACAO");
  });

  it("69 anos de quem já doou: apto. Um dia depois (70 anos): avaliação médica", () => {
    const jaDoou = { jaDoou: true, ultimaDoacao: mesesAtras(12) };
    expect(rodar(jaDoou, nascidoComIdade(70, 1)).resultado).toBe("APTO"); // ainda 69
    const setenta = rodar(jaDoou, nascidoComIdade(70));
    expect(setenta.resultado).toBe("AVALIACAO");
    expect(codigos(setenta)).toEqual(["idade.maisDe70"]);
  });

  it("70 anos ou mais sem nunca ter doado: inapto por idade", () => {
    const a = rodar({ jaDoou: false }, nascidoComIdade(70));
    expect(a.resultado).toBe("INAPTO");
    expect(codigos(a)).toEqual(["idade.primeiraDoacao"]);
  });
});

describe("peso (Art. 40): 49 e 50 kg", () => {
  it.each([49, 49.9, 30])("%s kg: inapto por peso", (peso) => {
    const a = rodar({ peso });
    expect(a.resultado).toBe("INAPTO");
    expect(codigos(a)).toEqual(["peso.minimo"]);
    expect(a.motivos[0]!.mensagem).toContain("pelo menos 50 kg");
  });

  it.each([50, 50.1, 120])("%s kg: segue", (peso) => {
    expect(rodar({ peso }).resultado).toBe("APTO");
  });
});

describe("intervalo entre doações (Art. 38)", () => {
  it("homem: 2 meses", () => {
    const base = { sexo: "M", jaDoou: true };
    expect(rodar({ ...base, ultimaDoacao: mesesAtras(2) }).resultado).toBe("APTO");
    const barrado = rodar({ ...base, ultimaDoacao: somarDias(mesesAtras(2), 1) });
    expect(barrado.resultado).toBe("INAPTO_TEMPORARIO");
    expect(barrado.liberadoEm).toBe(somarDias(HOJE, 1));
  });

  it("mulher: 3 meses", () => {
    const base = { sexo: "F", jaDoou: true };
    expect(rodar({ ...base, ultimaDoacao: mesesAtras(3) }).resultado).toBe("APTO");
    expect(rodar({ ...base, ultimaDoacao: somarDias(mesesAtras(3), 1) }).resultado).toBe("INAPTO_TEMPORARIO");
    // Dois meses atrás já é suficiente para homem, mas não para mulher.
    expect(rodar({ ...base, ultimaDoacao: mesesAtras(2) }).resultado).toBe("INAPTO_TEMPORARIO");
  });

  it("quem prefere não informar o sexo usa o intervalo maior (3 meses)", () => {
    const base = { sexo: "N", jaDoou: true };
    expect(rodar({ ...base, ultimaDoacao: mesesAtras(2) }).resultado).toBe("INAPTO_TEMPORARIO");
    expect(rodar({ ...base, ultimaDoacao: mesesAtras(3) }).resultado).toBe("APTO");
  });

  it("avisa do limite de doações por ano", () => {
    const a = rodar({ jaDoou: true, ultimaDoacao: mesesAtras(12) });
    expect(a.avisos.join(" ")).toContain("4 doações");
  });
});

describe("como você está hoje (Art. 53, 55 e 56)", () => {
  it("não estar bem hoje barra, sem data de retorno", () => {
    const a = rodar({ bemHoje: false });
    expect(a.resultado).toBe("INAPTO_TEMPORARIO");
    expect(a.liberadoEm).toBeNull();
    expect(a.mensagem).toContain("Responda ao formulário de novo");
  });

  describe("gripe ou resfriado COM febre (2 semanas)", () => {
    const com = (fim: DataISO) => rodar({ gripe: true, gripeFebre: true, gripeSituacao: "acabou", gripeFim: fim });
    it("13 dias depois do fim dos sintomas: barra, volta amanhã", () => {
      const a = com(diasAtras(13));
      expect(a.resultado).toBe("INAPTO_TEMPORARIO");
      expect(a.liberadoEm).toBe(somarDias(HOJE, 1));
    });
    it("14 dias depois do fim dos sintomas: passa", () => {
      expect(com(diasAtras(14)).resultado).toBe("APTO");
    });
  });

  describe("resfriado comum SEM febre (3 dias)", () => {
    const sem = (fim: DataISO) => rodar({ gripe: true, gripeFebre: false, gripeSituacao: "acabou", gripeFim: fim });
    it("2 dias depois: barra", () => {
      expect(sem(diasAtras(2)).resultado).toBe("INAPTO_TEMPORARIO");
    });
    it("3 dias depois: passa", () => {
      expect(sem(diasAtras(3)).resultado).toBe("APTO");
    });
  });

  it("quem ainda está com os sintomas: barra sem data", () => {
    const a = rodar({ gripe: true, gripeFebre: false, gripeSituacao: "ainda" });
    expect(a.resultado).toBe("INAPTO_TEMPORARIO");
    expect(a.liberadoEm).toBeNull();
    expect(a.motivos[0]!.mensagem).toContain("3 dias");
  });

  it("sinais de alerta sem explicação vão para avaliação, sem barrar", () => {
    const a = rodar({ sinaisAlerta: true });
    expect(a.resultado).toBe("AVALIACAO");
    expect(codigos(a)).toEqual(["sinaisAlerta"]);
  });
});

describe("tatuagem, piercing e procedimentos estéticos (Anexo 2; Art. 65)", () => {
  const proc = (opcao: string, data: DataISO, seguro: string) => ({ procedimentos: { [opcao]: { data, seguro } } });

  it("local seguro: 6 dias barra, 7 dias passa", () => {
    const barrado = rodar(proc("tatuagem", diasAtras(6), "sim"));
    expect(barrado.resultado).toBe("INAPTO_TEMPORARIO");
    expect(barrado.liberadoEm).toBe(somarDias(HOJE, 1));
    expect(rodar(proc("tatuagem", diasAtras(7), "sim")).resultado).toBe("APTO");
  });

  it.each(["nao", "naoSei"])("local sem segurança comprovada (%s): 4 meses", (seguro) => {
    const base = baseQueVenceHoje({ meses: 4 });
    expect(rodar(proc("tatuagem", base, seguro)).resultado).toBe("APTO");
    const barrado = rodar(proc("tatuagem", baseUmDiaAntesDeVencer({ meses: 4 }), seguro));
    expect(barrado.resultado).toBe("INAPTO_TEMPORARIO");
    expect(barrado.liberadoEm).toBe(somarDias(HOJE, 1));
    expect(barrado.motivos[0]!.mensagem).toContain("sem como confirmar a segurança");
  });

  it("valem as mesmas regras para maquiagem definitiva, piercing comum, acupuntura e procedimento estético", () => {
    for (const opcao of ["maquiagem", "piercing", "acupuntura", "estetico"]) {
      expect(rodar(proc(opcao, diasAtras(6), "sim")).resultado).toBe("INAPTO_TEMPORARIO");
      expect(rodar(proc(opcao, diasAtras(7), "sim")).resultado).toBe("APTO");
    }
  });

  it("com mais de um procedimento, vale a data de retorno mais distante", () => {
    const a = rodar({
      procedimentos: {
        tatuagem: { data: diasAtras(2), seguro: "sim" }, // volta em 5 dias
        estetico: { data: diasAtras(10), seguro: "nao" }, // volta em 4 meses menos 10 dias
      },
    });
    expect(a.resultado).toBe("INAPTO_TEMPORARIO");
    expect(a.liberadoEm).toBe(somarMeses(diasAtras(10), 4));
    expect(a.motivos).toHaveLength(2);
  });

  describe("piercing na boca ou na região genital", () => {
    it("ainda usando: barra sem data", () => {
      const a = rodar({ piercingBocaGenital: "usando" });
      expect(a.resultado).toBe("INAPTO_TEMPORARIO");
      expect(a.liberadoEm).toBeNull();
    });
    it("tirou há menos de 4 meses: barra; há 4 meses: passa", () => {
      const passa = baseQueVenceHoje({ meses: 4 });
      expect(rodar({ piercingBocaGenital: "retirado", piercingRetirada: passa }).resultado).toBe("APTO");
      expect(rodar({ piercingBocaGenital: "retirado", piercingRetirada: somarDias(passa, 1) }).resultado).toBe("INAPTO_TEMPORARIO");
    });
  });
});

describe("remédios (Anexo 3)", () => {
  const parou = (opcao: string, data: DataISO) => ({ remedios: { [opcao]: { situacao: "parou", data } } });
  const usando = (opcao: string) => ({ remedios: { [opcao]: { situacao: "usando" } } });

  // [opção, prazo, resultado quando o prazo já passou]
  it.each([
    ["antibiotico", { dias: 14 }, "APTO"],
    ["antipsicotico", { dias: 7 }, "APTO"],
    ["emagrecedor", { dias: 7 }, "APTO"],
    ["isotretinoina", { meses: 1 }, "APTO"],
    ["finasterida", { meses: 1 }, "APTO"],
    ["dutasterida", { meses: 6 }, "APTO"],
    ["acitretina", { anos: 3 }, "APTO"],
    ["testosterona", { meses: 4 }, "APTO"],
    ["prepOral", { meses: 4 }, "APTO"],
    ["prepInjetavel", { meses: 24 }, "APTO"],
    // Estes têm prazo e também pedem avaliação do motivo da receita.
    ["corticoide", { dias: 2 }, "AVALIACAO"],
    ["varfarina", { dias: 7 }, "AVALIACAO"],
    ["anticoagulanteNovo", { dias: 2 }, "AVALIACAO"],
    ["clopidogrel", { dias: 14 }, "AVALIACAO"],
    ["ticagrelor", { dias: 7 }, "AVALIACAO"],
    ["prasugrel", { dias: 3 }, "AVALIACAO"],
    ["imunossupressor", { meses: 12 }, "AVALIACAO"],
  ] as Array<[string, Prazo, string]>)("%s: o prazo %o é respeitado no dia exato", (opcao, prazo, depois) => {
    const passa = rodar(parou(opcao, baseQueVenceHoje(prazo)));
    expect(passa.resultado).toBe(depois);
    expect(passa.motivos.some((m) => m.tipo === "TEMPORARIO")).toBe(false);

    const barra = rodar(parou(opcao, baseUmDiaAntesDeVencer(prazo)));
    expect(barra.resultado).toBe("INAPTO_TEMPORARIO");
    expect(barra.liberadoEm).toBe(somarDias(HOJE, 1));
  });

  it("quem ainda usa fica sem data de retorno e a mensagem diz o prazo depois da última dose", () => {
    const a = rodar(usando("antibiotico"));
    expect(a.resultado).toBe("INAPTO_TEMPORARIO");
    expect(a.liberadoEm).toBeNull();
    expect(a.motivos[0]!.mensagem).toContain("14 dias depois da última dose");
  });

  it("insulina impede; remédio de outro tipo vai para avaliação", () => {
    expect(rodar({ remedios: { insulina: {} } }).resultado).toBe("INAPTO");
    const outro = rodar({ remedios: { outro: {} } });
    expect(outro.resultado).toBe("AVALIACAO");
    expect(codigos(outro)).toEqual(["remedios.outro"]);
  });

  it("avisa para não parar o remédio por causa da doação", () => {
    expect(rodar(parou("antibiotico", mesesAtras(2))).avisos.join(" ")).toContain("Não pare de tomar um remédio receitado");
    expect(rodar().avisos.join(" ")).not.toContain("Não pare de tomar");
  });
});

describe("vacinas (Anexo 4)", () => {
  const vacina = (opcao: string, data: DataISO, extra: object = {}) => ({ vacinas: { [opcao]: { data, ...extra } } });

  it.each([
    ["viva", { dias: 28 }],
    ["inativada", { dias: 2 }],
    ["covid", { dias: 7 }],
  ] as Array<[string, Prazo]>)("%s: o prazo %o é respeitado no dia exato", (opcao, prazo) => {
    expect(rodar(vacina(opcao, baseQueVenceHoje(prazo))).resultado).toBe("APTO");
    expect(rodar(vacina(opcao, baseUmDiaAntesDeVencer(prazo))).resultado).toBe("INAPTO_TEMPORARIO");
  });

  it("antirrábica: 48 horas, ou 12 meses se foi depois de mordida ou arranhão de animal", () => {
    expect(rodar(vacina("antirrabica", baseQueVenceHoje({ dias: 2 }), { aposAnimal: false })).resultado).toBe("APTO");
    expect(rodar(vacina("antirrabica", baseUmDiaAntesDeVencer({ dias: 2 }), { aposAnimal: false })).resultado).toBe("INAPTO_TEMPORARIO");
    expect(rodar(vacina("antirrabica", baseQueVenceHoje({ meses: 12 }), { aposAnimal: true })).resultado).toBe("APTO");
    expect(rodar(vacina("antirrabica", baseUmDiaAntesDeVencer({ meses: 12 }), { aposAnimal: true })).resultado).toBe("INAPTO_TEMPORARIO");
  });

  it("vacina que a pessoa não sabe qual é vai para avaliação", () => {
    expect(rodar({ vacinas: { naoSei: {} } }).resultado).toBe("AVALIACAO");
  });
});

describe("cirurgias, exames, dentista e transfusão (Anexo 2; Art. 66, X; Art. 67)", () => {
  const cirurgia = (opcao: string, data: DataISO) => ({ cirurgias: { [opcao]: { data } } });

  it.each([
    ["endoscopia", { meses: 4 }],
    ["laparoscopia", { meses: 4 }],
    ["pequena", { meses: 3 }],
    ["media", { meses: 6 }],
    ["grande", { meses: 12 }],
    ["litotripsia", { meses: 1 }],
  ] as Array<[string, Prazo]>)("%s: o prazo %o é respeitado no dia exato", (opcao, prazo) => {
    expect(rodar(cirurgia(opcao, baseQueVenceHoje(prazo))).resultado).toBe("APTO");
    expect(rodar(cirurgia(opcao, baseUmDiaAntesDeVencer(prazo))).resultado).toBe("INAPTO_TEMPORARIO");
  });

  it("cirurgia dos olhos e procedimento de pele: só depois da alta ou da cicatrização", () => {
    expect(rodar({ cirurgias: { olho: { recuperado: false } } }).resultado).toBe("INAPTO_TEMPORARIO");
    expect(rodar({ cirurgias: { olho: { recuperado: true } } }).resultado).toBe("APTO");
    expect(rodar({ cirurgias: { pele: { recuperado: false } } }).resultado).toBe("INAPTO_TEMPORARIO");
    expect(rodar({ cirurgias: { pele: { recuperado: true } } }).resultado).toBe("APTO");
  });

  it("outra cirurgia vai para avaliação", () => {
    expect(rodar({ cirurgias: { outra: {} } }).resultado).toBe("AVALIACAO");
  });

  it.each([
    ["semAnestesia", { dias: 1 }],
    ["limpeza", { dias: 3 }],
    ["extracao", { dias: 7 }],
    ["anestesiaGeral", { meses: 1 }],
  ] as Array<[string, Prazo]>)("dentista (%s): o prazo %o é respeitado no dia exato", (opcao, prazo) => {
    expect(rodar({ dentista: { [opcao]: { data: baseQueVenceHoje(prazo) } } }).resultado).toBe("APTO");
    expect(rodar({ dentista: { [opcao]: { data: baseUmDiaAntesDeVencer(prazo) } } }).resultado).toBe("INAPTO_TEMPORARIO");
  });

  it("transfusão: 4 meses", () => {
    expect(rodar({ transfusao: true, transfusaoData: baseQueVenceHoje({ meses: 4 }) }).resultado).toBe("APTO");
    expect(rodar({ transfusao: true, transfusaoData: baseUmDiaAntesDeVencer({ meses: 4 }) }).resultado).toBe("INAPTO_TEMPORARIO");
  });
});

describe("doenças e condições (Anexo 1)", () => {
  it.each(["hepatite", "hiv", "chagas", "avc", "coracao", "diabetes", "rim", "pulmao", "autoimune", "coagulacao", "hanseniase", "anafilaxia", "cirurgiaGrave"])(
    "%s impede a doação",
    (condicao) => {
      const a = rodar({ condicoes: { [condicao]: {} } });
      expect(a.resultado).toBe("INAPTO");
      expect(a.liberadoEm).toBeNull();
    },
  );

  it("infecções crônicas aparecem na tela com texto neutro (não dizem qual é)", () => {
    for (const condicao of ["hepatite", "hiv", "chagas", "hanseniase"]) {
      const motivo = rodar({ condicoes: { [condicao]: {} } }).motivos[0]!;
      expect(motivo.mensagem).toBe("Infecção que impede a doação de sangue.");
    }
  });

  it("epilepsia e outra doença crônica vão para avaliação", () => {
    expect(rodar({ condicoes: { epilepsia: {} } }).resultado).toBe("AVALIACAO");
    expect(rodar({ condicoes: { outraCronica: {} } }).resultado).toBe("AVALIACAO");
  });

  describe("câncer", () => {
    const cancer = (detalhes: object) => rodar({ condicoes: { cancer: detalhes } });
    it("melanoma ou câncer do sangue: inapto", () => {
      expect(cancer({ tipo: "grave" }).resultado).toBe("INAPTO");
    });
    it("basocelular de pele ou carcinoma in situ do colo do útero: não impede", () => {
      expect(cancer({ tipo: "leve" }).resultado).toBe("APTO");
    });
    it("outro tipo em tratamento: barra sem data", () => {
      const a = cancer({ tipo: "outro", situacao: "emTratamento" });
      expect(a.resultado).toBe("INAPTO_TEMPORARIO");
      expect(a.liberadoEm).toBeNull();
    });
    it("outro tipo: 5 anos depois do fim do tratamento (e a triagem confirma a remissão)", () => {
      const passa = cancer({ tipo: "outro", situacao: "terminou", fim: baseQueVenceHoje({ anos: 5 }) });
      expect(passa.resultado).toBe("AVALIACAO");
      expect(codigos(passa)).toEqual(["condicoes.cancer.avaliacao"]);

      const barra = cancer({ tipo: "outro", situacao: "terminou", fim: baseUmDiaAntesDeVencer({ anos: 5 }) });
      expect(barra.resultado).toBe("INAPTO_TEMPORARIO");
      expect(barra.liberadoEm).toBe(somarDias(HOJE, 1));
    });
  });

  describe("infecção sexualmente transmissível (Art. 64)", () => {
    it("em tratamento: barra sem data", () => {
      expect(rodar({ ist: true, istSituacao: "tratando" }).liberadoEm).toBeNull();
      expect(rodar({ ist: true, istSituacao: "tratando" }).resultado).toBe("INAPTO_TEMPORARIO");
    });
    it("12 meses depois da cura", () => {
      expect(rodar({ ist: true, istSituacao: "curado", istCura: baseQueVenceHoje({ meses: 12 }) }).resultado).toBe("APTO");
      expect(rodar({ ist: true, istSituacao: "curado", istCura: baseUmDiaAntesDeVencer({ meses: 12 }) }).resultado).toBe("INAPTO_TEMPORARIO");
    });
  });
});

describe("situações de risco (Art. 62 a 66)", () => {
  it.each(["parceiroNovo", "parceiroOcasional", "trocaDinheiro", "parceiroInfectado", "violencia", "parceiroHemodialise"])(
    "%s: 4 meses",
    (opcao) => {
      expect(rodar({ riscoSexual: { [opcao]: { data: baseQueVenceHoje({ meses: 4 }) } } }).resultado).toBe("APTO");
      const barra = rodar({ riscoSexual: { [opcao]: { data: baseUmDiaAntesDeVencer({ meses: 4 }) } } });
      expect(barra.resultado).toBe("INAPTO_TEMPORARIO");
      expect(barra.liberadoEm).toBe(somarDias(HOJE, 1));
    },
  );

  it("a mensagem na tela não revela o tipo de situação (texto neutro)", () => {
    const a = rodar({ riscoSexual: { parceiroOcasional: { data: diasAtras(10) } } });
    expect(a.motivos[0]!.mensagem).toContain("Situação de risco para infecções nos últimos 4 meses");
    expect(a.motivos[0]!.mensagem.toLowerCase()).not.toContain("sexual");
    expect(a.motivos[0]!.mensagem.toLowerCase()).not.toContain("parceir");
  });

  it("“prefiro falar na triagem” vai para avaliação, nunca para apto", () => {
    for (const pergunta of ["riscoSexual", "drogas"]) {
      const a = rodar({ [pergunta]: { prefiroFalar: {} } });
      expect(a.resultado).toBe("AVALIACAO");
    }
  });

  it("droga injetável impede; cocaína ou crack: 12 meses; maconha: até amanhã", () => {
    expect(rodar({ drogas: { injetavel: {} } }).resultado).toBe("INAPTO");

    expect(rodar({ drogas: { cocainaCrack: { data: baseQueVenceHoje({ meses: 12 }) } } }).resultado).toBe("APTO");
    expect(rodar({ drogas: { cocainaCrack: { data: baseUmDiaAntesDeVencer({ meses: 12 }) } } }).resultado).toBe("INAPTO_TEMPORARIO");

    const maconha = rodar({ drogas: { maconha: {} } });
    expect(maconha.resultado).toBe("INAPTO_TEMPORARIO");
    expect(maconha.liberadoEm).toBe(somarDias(HOJE, 1));
  });
});

describe("viagens e malária (Art. 57): 30 dias", () => {
  it("29 dias barra, 30 dias passa", () => {
    expect(rodar({ malaria: true, malariaData: diasAtras(30) }).resultado).toBe("APTO");
    const barra = rodar({ malaria: true, malariaData: diasAtras(29) });
    expect(barra.resultado).toBe("INAPTO_TEMPORARIO");
    expect(barra.liberadoEm).toBe(somarDias(HOJE, 1));
  });
});

describe("gestação e amamentação (Art. 45)", () => {
  it("grávida: barra sem data", () => {
    const a = rodar({ gestacao: { gravida: {} } });
    expect(a.resultado).toBe("INAPTO_TEMPORARIO");
    expect(a.liberadoEm).toBeNull();
  });

  it("parto ou aborto: 12 semanas (84 dias)", () => {
    expect(rodar({ gestacao: { partoAborto: { data: diasAtras(84) } } }).resultado).toBe("APTO");
    expect(rodar({ gestacao: { partoAborto: { data: diasAtras(83) } } }).resultado).toBe("INAPTO_TEMPORARIO");
  });

  it("amamentando bebê com menos de 12 meses", () => {
    expect(rodar({ gestacao: { amamentando: { data: mesesAtras(12) } } }).resultado).toBe("APTO");
    expect(rodar({ gestacao: { amamentando: { data: somarDias(mesesAtras(12), 1) } } }).resultado).toBe("INAPTO_TEMPORARIO");
  });
});

describe("vários motivos juntos", () => {
  it("vale a data mais distante entre os impedimentos com prazo", () => {
    const a = rodar({
      remedios: { antibiotico: { situacao: "parou", data: diasAtras(10) } }, // volta em 4 dias
      transfusao: true,
      transfusaoData: diasAtras(30), // volta em 4 meses - 30 dias
    });
    expect(a.resultado).toBe("INAPTO_TEMPORARIO");
    expect(a.liberadoEm).toBe(somarMeses(diasAtras(30), 4));
    expect(a.mensagem).toContain("O agendamento estará disponível a partir de");
  });

  it("um impedimento sem data deixa a data de retorno em branco", () => {
    const a = rodar({
      transfusao: true,
      transfusaoData: diasAtras(30),
      gripe: true,
      gripeFebre: false,
      gripeSituacao: "ainda",
    });
    expect(a.resultado).toBe("INAPTO_TEMPORARIO");
    expect(a.liberadoEm).toBeNull();
    expect(a.motivos).toHaveLength(2);
  });

  it("inapto vence temporário, que vence avaliação; os motivos saem nessa ordem", () => {
    const a = rodar({
      sinaisAlerta: true, // avaliação
      transfusao: true,
      transfusaoData: diasAtras(10), // temporário
      condicoes: { hiv: {} }, // inapto
    });
    expect(a.resultado).toBe("INAPTO");
    expect(a.liberadoEm).toBeNull();
    expect(a.motivos.map((m) => m.tipo)).toEqual(["INAPTO", "TEMPORARIO", "AVALIACAO"]);
    expect(a.mensagem).toContain("não é indicada");
  });

  it("temporário vence avaliação: a avaliação continua listada nos motivos", () => {
    const a = rodar({ sinaisAlerta: true, transfusao: true, transfusaoData: diasAtras(10) });
    expect(a.resultado).toBe("INAPTO_TEMPORARIO");
    expect(a.motivos.map((m) => m.tipo)).toEqual(["TEMPORARIO", "AVALIACAO"]);
  });

  it("a avaliação não bloqueia: o resultado AVALIACAO libera o agendamento e traz a dica do dia", () => {
    const a = rodar({ condicoes: { epilepsia: {} } });
    expect(a.resultado).toBe("AVALIACAO");
    expect(a.mensagem).toContain("A triagem no hemocentro vai avaliar");
    expect(a.avisos.at(-1)).toMatch(/No dia da doação/);
  });

  it("cada motivo traz o artigo ou anexo da Portaria", () => {
    const a = rodar({ transfusao: true, transfusaoData: diasAtras(10), condicoes: { hiv: {} } });
    for (const m of a.motivos) expect(m.fonte).toMatch(/Art\.|Anexo/);
  });
});

import { describe, expect, it } from "vitest";
import { INSTITUICOES } from "../prisma/dados/instituicoes";
import { JANELA_DE_DIAS, chaveDoHorario, gerarAgenda, ocupadoNaSimulacao, type EntradaDaGrade } from "../src/agenda/grade";
import { diaDaSemana, horaDeMinutos, horaEmBrasilia, instanteEmBrasilia, minutosDoDia, misturar } from "../src/agenda/horario";
import { medicosDaInstituicao, type MedicoSimulado } from "../src/agenda/medicosSimulados";
import { somarDias } from "../src/triagem/datas";

// HU-04: a grade de horários da "instituição de mentira" (médicos inventados, horários livres e ocupados).
// Os testes fixam o momento: segunda-feira, 19/10/2026, 06:00 em Brasília (09:00 UTC).

const SEGUNDA_6H = new Date("2026-10-19T09:00:00Z");

const medico = (extra: Partial<MedicoSimulado> = {}): MedicoSimulado => ({
  codigo: "m1",
  nome: "Dr. Teste",
  especialidade: "Teste",
  dias: [1],
  turnos: [{ inicio: "08:00", fim: "10:00" }],
  duracaoMin: 30,
  ...extra,
});

const entrada = (extra: Partial<EntradaDaGrade> = {}): EntradaDaGrade => ({
  instituicaoCodigo: "inst-x",
  medicos: [medico()],
  agora: SEGUNDA_6H,
  reservados: new Set(),
  ...extra,
});

const horasDoDia = (dias: ReturnType<typeof gerarAgenda>, data: string) =>
  dias.find((d) => d.data === data)?.medicos[0].horarios.map((h) => h.hora);

describe("horários e datas em Brasília", () => {
  it("converte Brasília para UTC e de volta (UTC-3)", () => {
    expect(instanteEmBrasilia("2026-10-19", "08:30").toISOString()).toBe("2026-10-19T11:30:00.000Z");
    expect(horaEmBrasilia(new Date("2026-10-19T11:30:00Z"))).toBe("08:30");
    // Depois das 21h em Brasília já é o dia seguinte em UTC.
    expect(instanteEmBrasilia("2026-10-19", "22:00").toISOString()).toBe("2026-10-20T01:00:00.000Z");
    expect(horaEmBrasilia(new Date("2026-10-20T01:00:00Z"))).toBe("22:00");
  });

  it("dia da semana: 1 = segunda ... 7 = domingo", () => {
    expect(diaDaSemana("2026-10-19")).toBe(1);
    expect(diaDaSemana("2026-10-24")).toBe(6);
    expect(diaDaSemana("2026-10-25")).toBe(7);
  });

  it("minutos e horas se convertem", () => {
    expect(minutosDoDia("08:30")).toBe(510);
    expect(horaDeMinutos(510)).toBe("08:30");
    expect(horaDeMinutos(minutosDoDia("17:30"))).toBe("17:30");
    expect(horaDeMinutos(minutosDoDia("07:05"))).toBe("07:05");
  });

  it("o número misturado é sempre o mesmo para o mesmo texto e muda com o texto", () => {
    expect(misturar("abc")).toBe(misturar("abc"));
    expect(misturar("abc")).not.toBe(misturar("abd"));
    expect(misturar("abc")).toBeGreaterThanOrEqual(0);
  });
});

describe("os horários de um médico", () => {
  it("saem a cada 30 minutos e o último termina junto com o turno", () => {
    const dias = gerarAgenda(entrada());

    expect(horasDoDia(dias, "2026-10-19")).toEqual(["08:00", "08:30", "09:00", "09:30"]);
  });

  it("o atendimento precisa caber no turno: com 45 minutos sobram só dois horários", () => {
    const dias = gerarAgenda(entrada({ medicos: [medico({ duracaoMin: 45 })] }));

    expect(horasDoDia(dias, "2026-10-19")).toEqual(["08:00", "08:45"]);
  });

  it("vários turnos no dia deixam a pausa (almoço) sem horários", () => {
    const turnos = [
      { inicio: "08:00", fim: "09:00" },
      { inicio: "13:00", fim: "14:00" },
    ];

    const dias = gerarAgenda(entrada({ medicos: [medico({ turnos })] }));

    expect(horasDoDia(dias, "2026-10-19")).toEqual(["08:00", "08:30", "13:00", "13:30"]);
  });

  it("guarda o instante em UTC (08:00 em Brasília = 11:00 UTC) e a hora pronta para mostrar", () => {
    const [primeiro] = gerarAgenda(entrada())[0].medicos[0].horarios;

    expect(primeiro.inicio).toBe("2026-10-19T11:00:00.000Z");
    expect(primeiro.hora).toBe("08:00");
  });

  it("só aparece nos dias da semana em que o médico atende", () => {
    const dias = gerarAgenda(entrada({ medicos: [medico({ dias: [1, 3] })] }));

    // segunda 19, quarta 21, segunda 26 e quarta 28 (o domingo 25 e os outros dias não).
    expect(dias.map((d) => d.data)).toEqual(["2026-10-19", "2026-10-21", "2026-10-26", "2026-10-28"]);
  });

  it("um médico que não atende no dia não aparece nele, mas os outros sim", () => {
    const soTerca = medico({ codigo: "m2", dias: [2] });
    const dias = gerarAgenda(entrada({ medicos: [medico(), soTerca] }));

    expect(dias.find((d) => d.data === "2026-10-19")!.medicos.map((m) => m.codigo)).toEqual(["m1"]);
    expect(dias.find((d) => d.data === "2026-10-20")!.medicos.map((m) => m.codigo)).toEqual(["m2"]);
  });
});

describe("a janela de dias e a antecedência mínima", () => {
  it("mostra 14 dias, a começar por hoje (19/10 a 01/11)", () => {
    const dias = gerarAgenda(entrada({ medicos: [medico({ dias: [1, 2, 3, 4, 5, 6, 7] })] }));

    expect(JANELA_DE_DIAS).toBe(14);
    expect(dias).toHaveLength(14);
    expect(dias[0].data).toBe("2026-10-19");
    expect(dias.at(-1)!.data).toBe("2026-11-01");
  });

  it("só mostra horários que começam daqui a pelo menos 2 horas (exatamente 2 horas ainda vale)", () => {
    // 06:00 + 2 h = 08:00: o horário das 08:00 é o primeiro.
    expect(horasDoDia(gerarAgenda(entrada({ agora: SEGUNDA_6H })), "2026-10-19")![0]).toBe("08:00");

    // 1 milissegundo depois, o horário das 08:00 já ficou perto demais.
    const logoDepois = new Date(SEGUNDA_6H.getTime() + 1);
    expect(horasDoDia(gerarAgenda(entrada({ agora: logoDepois })), "2026-10-19")![0]).toBe("08:30");
  });

  it("quando não sobra horário hoje, o dia não aparece", () => {
    // 09:30 em Brasília: os horários de hoje terminam às 10:00 e já estão a menos de 2 horas.
    const dias = gerarAgenda(entrada({ agora: new Date("2026-10-19T12:30:00Z") }));

    expect(dias[0].data).toBe("2026-10-26");
  });

  it("horários de hoje que já passaram não aparecem", () => {
    // 08:40 em Brasília: só entram horários a partir das 10:40, e este médico termina às 10:00.
    const dias = gerarAgenda(entrada({ agora: new Date("2026-10-19T11:40:00Z") }));

    expect(dias.some((d) => d.data === "2026-10-19")).toBe(false);
  });
});

describe("livres e ocupados", () => {
  it("o que o VITTA já reservou aparece ocupado, e só isso muda", () => {
    const livre = gerarAgenda(entrada());
    const reservado = chaveDoHorario("m1", "2026-10-19T11:30:00.000Z"); // 08:30

    const comReserva = gerarAgenda(entrada({ reservados: new Set([reservado]) }));

    const antes = livre[0].medicos[0].horarios;
    const depois = comReserva[0].medicos[0].horarios;
    expect(depois.find((h) => h.hora === "08:30")!.status).toBe("OCUPADO");
    // Todos os outros horários ficam como estavam.
    expect(depois.filter((h) => h.hora !== "08:30")).toEqual(antes.filter((h) => h.hora !== "08:30"));
  });

  it("os contadores de cada dia batem com os horários", () => {
    const dias = gerarAgenda(entrada({ medicos: medicosDaInstituicao("hemocentro-de-brasilia") }));

    for (const dia of dias) {
      const todos = dia.medicos.flatMap((m) => m.horarios);
      expect(dia.livres).toBe(todos.filter((h) => h.status === "LIVRE").length);
      expect(dia.ocupados).toBe(todos.filter((h) => h.status === "OCUPADO").length);
      expect(dia.livres + dia.ocupados).toBe(todos.length);
    }
  });

  it("é sempre a mesma agenda para o mesmo momento", () => {
    const uma = gerarAgenda(entrada({ medicos: medicosDaInstituicao("demo-taguatinga") }));
    const outra = gerarAgenda(entrada({ medicos: medicosDaInstituicao("demo-taguatinga") }));

    expect(outra).toEqual(uma);
  });

  it("a simulação deixa mais ou menos metade dos horários ocupada (e metade livre)", () => {
    let livres = 0;
    let ocupados = 0;
    for (const { codigo } of INSTITUICOES) {
      const dias = gerarAgenda({ instituicaoCodigo: codigo, medicos: medicosDaInstituicao(codigo), agora: SEGUNDA_6H, reservados: new Set() });
      for (const dia of dias) {
        livres += dia.livres;
        ocupados += dia.ocupados;
      }
    }

    const proporcao = ocupados / (livres + ocupados);
    expect(livres).toBeGreaterThan(100);
    expect(proporcao).toBeGreaterThan(0.35);
    expect(proporcao).toBeLessThan(0.65);
  });

  it("de vez em quando um dia inteiro da instituição está lotado", () => {
    // Procura, nos próximos 60 dias, um dia que a regra manda lotar (1 em cada 9).
    let lotado: string | null = null;
    for (let i = 0; i < 60 && lotado === null; i++) {
      const data = somarDias("2026-10-19", i);
      if (misturar(`inst-x|dia|${data}`) % 9 === 0) lotado = data;
    }
    expect(lotado).not.toBeNull();

    for (const hora of ["08:00", "09:30", "14:00", "17:30"]) {
      const inicio = instanteEmBrasilia(lotado!, hora).toISOString();
      expect(ocupadoNaSimulacao("inst-x", "qualquer-medico", lotado!, inicio)).toBe(true);
    }
  });

  it("o mesmo horário dá sempre a mesma resposta, e horários diferentes dão respostas diferentes", () => {
    const inicio = instanteEmBrasilia("2026-10-20", "09:00").toISOString();
    expect(ocupadoNaSimulacao("inst-x", "m1", "2026-10-20", inicio)).toBe(ocupadoNaSimulacao("inst-x", "m1", "2026-10-20", inicio));

    const respostas = new Set<boolean>();
    for (let i = 0; i < 40; i++) {
      const dia = somarDias("2026-10-20", i);
      respostas.add(ocupadoNaSimulacao("inst-x", "m1", dia, instanteEmBrasilia(dia, "09:00").toISOString()));
    }
    expect(respostas.size).toBe(2);
  });
});

describe("os médicos inventados", () => {
  const todos = INSTITUICOES.flatMap((i) => medicosDaInstituicao(i.codigo).map((m) => ({ instituicao: i, medico: m })));

  it("toda instituição do mapa tem pelo menos 2 médicos, com identificadores únicos", () => {
    for (const { codigo } of INSTITUICOES) expect(medicosDaInstituicao(codigo).length).toBeGreaterThanOrEqual(2);

    const codigos = todos.map(({ medico: m }) => m.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it("os turnos fazem sentido: começam antes de terminar e cabem pelo menos um atendimento", () => {
    for (const { medico: m } of todos) {
      expect(m.duracaoMin).toBeGreaterThan(0);
      expect(m.dias.length).toBeGreaterThan(0);
      expect(m.dias.every((d) => d >= 1 && d <= 7)).toBe(true);
      expect(m.nome).toMatch(/^Dr[a]?\. /);
      for (const turno of m.turnos) {
        expect(minutosDoDia(turno.fim) - minutosDoDia(turno.inicio)).toBeGreaterThanOrEqual(m.duracaoMin);
      }
    }
  });

  it("os médicos atendem dentro do horário de funcionamento da instituição", () => {
    for (const { instituicao, medico: m } of todos) {
      // Hemocentro de Brasília: segunda a sábado, das 7h15 às 18h. Postos de demonstração: segunda a sexta, das 8h às 17h.
      const [primeiroDia, abre, fecha] = instituicao.demonstracao ? [5, "08:00", "17:00"] : [6, "07:15", "18:00"];
      expect(Math.max(...m.dias)).toBeLessThanOrEqual(primeiroDia);
      for (const turno of m.turnos) {
        expect(minutosDoDia(turno.inicio)).toBeGreaterThanOrEqual(minutosDoDia(abre as string));
        expect(minutosDoDia(turno.fim)).toBeLessThanOrEqual(minutosDoDia(fecha as string));
      }
    }
  });

  it("instituição nova, sem médicos inventados, recebe dois da lista padrão (sempre os mesmos)", () => {
    const medicos = medicosDaInstituicao("instituicao-nova");

    expect(medicos).toHaveLength(2);
    expect(medicos.map((m) => m.codigo)).toEqual(["instituicao-nova-padrao-1", "instituicao-nova-padrao-2"]);
    expect(medicos[0].dias).toEqual([1, 2, 3, 4, 5]);
    expect(medicosDaInstituicao("instituicao-nova")).toEqual(medicos);
  });
});

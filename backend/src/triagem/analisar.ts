// A conta do formulário (HU-03): lê as respostas e decide o resultado.
// Não acessa banco nem relógio: recebe tudo pronto (a data de hoje vem de fora), por isso é fácil de testar.
// Os prazos ficam em regras.ts; a estrutura das perguntas, em modelo.ts.
import { descreverPrazo, formatarBr, idadeEm, somarMeses, somarPrazo, type DataISO } from "./datas";
import type { Respostas } from "./modelo";
import {
  CIRURGIAS,
  CONDICOES,
  DENTISTA,
  DROGAS,
  GESTACAO,
  LIMITES,
  PRAZOS,
  PROCEDIMENTOS,
  REMEDIOS,
  RISCO_SEXUAL,
  VACINAS,
  temPrazo,
  type Regra,
} from "./regras";

export type TipoAchado = "TEMPORARIO" | "INAPTO" | "AVALIACAO";

// Um motivo do resultado. TEMPORARIO com "ate" = pode doar a partir dessa data;
// TEMPORARIO sem "ate" = volte a responder quando a situação mudar.
export type Achado = { codigo: string; tipo: TipoAchado; ate: DataISO | null; mensagem: string; fonte: string };

export type Resultado = "APTO" | "INAPTO_TEMPORARIO" | "INAPTO" | "AVALIACAO";

export type Analise = {
  resultado: Resultado;
  // Primeiro dia em que o agendamento pode abrir (só em INAPTO_TEMPORARIO, e só se todos os motivos tiverem data).
  liberadoEm: DataISO | null;
  mensagem: string;
  motivos: Achado[];
  avisos: string[];
};

export type ContextoAnalise = { nascimento: DataISO; hoje: DataISO };

type Mapa = Record<string, unknown>;
const mapa = (valor: unknown): Mapa => (valor !== null && typeof valor === "object" ? (valor as Mapa) : {});
const texto = (valor: unknown): string | undefined => (typeof valor === "string" ? valor : undefined);
const comPonto = (frase: string) => (/[.!?]$/.test(frase) ? frase : `${frase}.`);

// ---------------------------------------------------------------- coletor de motivos
function criarColetor(hoje: DataISO) {
  const achados: Achado[] = [];
  const avisos: string[] = [];

  return {
    achados,
    avisos,
    inapto(codigo: string, motivo: string, fonte: string) {
      achados.push({ codigo, tipo: "INAPTO", ate: null, mensagem: comPonto(motivo), fonte });
    },
    avaliacao(codigo: string, motivo: string, fonte: string) {
      achados.push({ codigo, tipo: "AVALIACAO", ate: null, mensagem: comPonto(motivo), fonte });
    },
    // Impedimento sem data de retorno: a pessoa responde de novo quando a situação mudar.
    semData(codigo: string, motivo: string, fonte: string) {
      achados.push({ codigo, tipo: "TEMPORARIO", ate: null, mensagem: comPonto(motivo), fonte });
    },
    // Impedimento com data de retorno. Se a data já passou, não há impedimento.
    ate(codigo: string, motivo: string, fonte: string, ate: DataISO) {
      if (ate <= hoje) return;
      achados.push({
        codigo,
        tipo: "TEMPORARIO",
        ate,
        mensagem: `${comPonto(motivo)} Você poderá doar a partir de ${formatarBr(ate)}.`,
        fonte,
      });
    },
  };
}
type Coletor = ReturnType<typeof criarColetor>;

// Aplica uma regra da tabela. "detalhes" são os campos da opção marcada (data, situacao).
function aplicarRegra(c: Coletor, codigo: string, regra: Regra, detalhes: Mapa = {}) {
  if (!temPrazo(regra)) {
    if (regra.resultado === "inapto") c.inapto(codigo, regra.motivo, regra.fonte);
    else if (regra.resultado === "avaliacao") c.avaliacao(codigo, regra.motivo, regra.fonte);
    else c.semData(codigo, regra.motivo, regra.fonte);
    return;
  }

  if (detalhes.situacao === "usando") {
    c.semData(codigo, `${regra.motivo}. Você poderá doar ${descreverPrazo(regra.prazo)} depois da última dose`, regra.fonte);
  } else {
    const data = texto(detalhes.data);
    if (data) c.ate(codigo, regra.motivo, regra.fonte, somarPrazo(data, regra.prazo));
  }
  if (regra.avaliar) c.avaliacao(`${codigo}.avaliacao`, regra.avaliar, regra.fonte);
}

// Percorre as opções marcadas de uma pergunta de marcar várias e aplica a regra de cada uma.
function aplicarTabela(c: Coletor, pergunta: string, resposta: unknown, tabela: Record<string, Regra>) {
  for (const [opcao, detalhes] of Object.entries(mapa(resposta))) {
    const regra = tabela[opcao];
    if (regra) aplicarRegra(c, `${pergunta}.${opcao}`, regra, mapa(detalhes));
  }
}

// ---------------------------------------------------------------- idade, peso e intervalo (Art. 38 a 40)
function analisarDadosBasicos(c: Coletor, r: Respostas, { nascimento, hoje }: ContextoAnalise) {
  const idade = idadeEm(nascimento, hoje);
  const jaDoou = r.jaDoou === true;

  if (idade < LIMITES.idadeMinima) {
    const aniversario = somarMeses(nascimento, LIMITES.idadeMinima * 12);
    c.inapto("idade.minima", `Você precisa ter pelo menos ${LIMITES.idadeMinima} anos para doar. Você completa ${LIMITES.idadeMinima} anos em ${formatarBr(aniversario)}`, "Art. 39");
  } else if (idade < LIMITES.maioridade) {
    c.avisos.push("Menores de 18 anos precisam levar, a cada doação, autorização escrita do responsável e cópia do documento dele.");
  }

  if (idade > LIMITES.idadeMaximaPrimeiraDoacao && r.jaDoou === false) {
    if (idade > LIMITES.idadeMaxima) {
      c.inapto("idade.primeiraDoacao", `A primeira doação de sangue só é possível até os ${LIMITES.idadeMaximaPrimeiraDoacao} anos`, "Art. 39, § 3º");
    } else {
      c.avaliacao(
        "idade.primeiraDoacao",
        `A primeira doação costuma ser possível até os ${LIMITES.idadeMaximaPrimeiraDoacao} anos. Acima disso, o médico do hemocentro avalia caso a caso`,
        "Art. 39, § 3º e § 4º",
      );
    }
  }
  if (idade > LIMITES.idadeMaxima && jaDoou) {
    c.avaliacao("idade.maisDe70", "Quem já doa e tem mais de 70 anos pode continuar depois de avaliação médica no hemocentro", "Art. 39, § 5º");
  }

  if (typeof r.peso === "number" && r.peso < LIMITES.pesoMinimoKg) {
    c.inapto(
      "peso.minimo",
      `Você precisa ter pelo menos ${LIMITES.pesoMinimoKg} kg para doar. Em casos especiais, o médico do hemocentro pode avaliar`,
      "Art. 40",
    );
  }

  const ultimaDoacao = texto(r.ultimaDoacao);
  if (jaDoou && ultimaDoacao) {
    const meses = r.sexo === "M" ? LIMITES.intervaloHomemMeses : LIMITES.intervaloMulherMeses;
    c.ate("intervalo", `O intervalo mínimo entre doações é de ${meses} meses`, "Art. 38, § 1º", somarMeses(ultimaDoacao, meses));
    c.avisos.push("Por ano, o limite é de 4 doações de sangue para homens e 3 para mulheres.");
  }
}

// ---------------------------------------------------------------- como você está hoje (Art. 53, 55 e 56)
function analisarEstadoDeHoje(c: Coletor, r: Respostas) {
  if (r.bemHoje === false) {
    c.semData("bemHoje", "Você não está se sentindo bem hoje. Responda de novo quando estiver bem", "Art. 53, I");
  }

  if (r.gripe === true) {
    const comFebre = r.gripeFebre === true;
    const prazo = comFebre ? PRAZOS.gripeComFebre : PRAZOS.gripeSemFebre;
    const motivo = comFebre ? "Gripe ou resfriado com febre (ou gripe confirmada)" : "Gripe ou resfriado recente";
    const fim = texto(r.gripeFim);
    if (r.gripeSituacao === "ainda") {
      c.semData("gripe", `${motivo}: você ainda está com sintomas. É preciso esperar ${descreverPrazo(prazo)} depois que eles acabarem`, "Art. 55");
    } else if (fim) {
      c.ate("gripe", `${motivo}: é preciso esperar ${descreverPrazo(prazo)} depois que os sintomas acabam`, "Art. 55; Anexo 1 (parte B)", somarPrazo(fim, prazo));
    }
  }

  if (r.sinaisAlerta === true) {
    c.avaliacao(
      "sinaisAlerta",
      "Você teve sinais que a triagem precisa avaliar (como febre prolongada, suor noturno, ínguas ou perda de peso sem explicação)",
      "Art. 40, § 2º; Art. 56",
    );
  }
}

// ---------------------------------------------------------------- tatuagem, piercing e procedimentos estéticos (Anexo 2; Art. 65)
function analisarEstetica(c: Coletor, r: Respostas) {
  for (const [opcao, detalhes] of Object.entries(mapa(r.procedimentos))) {
    const nome = PROCEDIMENTOS[opcao];
    const { data, seguro } = mapa(detalhes);
    if (!nome || typeof data !== "string") continue;

    // Local com segurança comprovada: 7 dias. Sem como avaliar a segurança: 4 meses.
    const seguroSim = seguro === "sim";
    const prazo = seguroSim ? PRAZOS.procedimentoLocalSeguro : PRAZOS.procedimentoSemSeguranca;
    const motivo = seguroSim
      ? `${nome} recente: é preciso esperar ${descreverPrazo(prazo)}`
      : `${nome} recente, sem como confirmar a segurança do local: é preciso esperar ${descreverPrazo(prazo)}`;
    c.ate(`procedimentos.${opcao}`, motivo, "Anexo 2 (parte A); Art. 66, VII", somarPrazo(data, prazo));
  }

  if (r.piercingBocaGenital === "usando") {
    c.semData(
      "piercingBocaGenital",
      `Piercing na boca ou na região genital: você só poderá doar ${descreverPrazo(PRAZOS.piercingBocaGenital)} depois de tirá-lo`,
      "Art. 65",
    );
  } else if (r.piercingBocaGenital === "retirado") {
    const retirada = texto(r.piercingRetirada);
    if (retirada) {
      c.ate("piercingBocaGenital", "Piercing na boca ou na região genital retirado há pouco tempo", "Art. 65", somarPrazo(retirada, PRAZOS.piercingBocaGenital));
    }
  }
}

// ---------------------------------------------------------------- remédios e vacinas (Anexos 3 e 4)
function analisarRemediosEVacinas(c: Coletor, r: Respostas) {
  aplicarTabela(c, "remedios", r.remedios, REMEDIOS);
  if (Object.keys(mapa(r.remedios)).length > 0) {
    c.avisos.push("Não pare de tomar um remédio receitado só para poder doar. Converse com o seu médico.");
  }

  for (const [opcao, detalhes] of Object.entries(mapa(r.vacinas))) {
    if (opcao === "antirrabica") {
      const { data, aposAnimal } = mapa(detalhes);
      if (typeof data !== "string") continue;
      const prazo = aposAnimal === true ? PRAZOS.antirrabicaComExposicao : PRAZOS.antirrabicaSemExposicao;
      c.ate("vacinas.antirrabica", "Vacina antirrábica", "Anexo 4", somarPrazo(data, prazo));
      continue;
    }
    const regra = VACINAS[opcao];
    if (regra) aplicarRegra(c, `vacinas.${opcao}`, regra, mapa(detalhes));
  }
}

// ---------------------------------------------------------------- cirurgias, dentista e transfusão (Anexo 2; Art. 66, X; Art. 67)
function analisarCirurgias(c: Coletor, r: Respostas) {
  for (const [opcao, detalhes] of Object.entries(mapa(r.cirurgias))) {
    // Cirurgia dos olhos e pequenos procedimentos de pele: vale depois da alta ou da cicatrização.
    if (opcao === "olho" || opcao === "pele") {
      if (mapa(detalhes).recuperado === false) {
        const motivo =
          opcao === "olho"
            ? "Cirurgia de miopia ou catarata: só é possível doar depois da alta do oftalmologista"
            : "Procedimento de pele: só é possível doar depois da cicatrização";
        c.semData(`cirurgias.${opcao}`, motivo, "Anexo 2 (parte A)");
      }
      continue;
    }
    const regra = CIRURGIAS[opcao];
    if (regra) aplicarRegra(c, `cirurgias.${opcao}`, regra, mapa(detalhes));
  }

  aplicarTabela(c, "dentista", r.dentista, DENTISTA);

  const dataTransfusao = texto(r.transfusaoData);
  if (r.transfusao === true && dataTransfusao) {
    c.ate("transfusao", "Transfusão de sangue ou de componentes recente", "Art. 66, X", somarPrazo(dataTransfusao, PRAZOS.transfusao));
  }
}

// ---------------------------------------------------------------- doenças e condições (Anexo 1)
function analisarDoencas(c: Coletor, r: Respostas) {
  for (const [opcao, detalhes] of Object.entries(mapa(r.condicoes))) {
    if (opcao === "cancer") {
      analisarCancer(c, mapa(detalhes));
      continue;
    }
    const regra = CONDICOES[opcao];
    if (regra) aplicarRegra(c, `condicoes.${opcao}`, regra);
  }

  if (r.ist === true) {
    const cura = texto(r.istCura);
    if (r.istSituacao === "tratando") {
      c.semData("ist", "Infecção sexualmente transmissível em tratamento: é preciso esperar 12 meses depois da cura", "Art. 64");
    } else if (cura) {
      c.ate("ist", "Infecção sexualmente transmissível recente: é preciso esperar 12 meses depois da cura", "Art. 64", somarPrazo(cura, PRAZOS.ist));
    }
  }
}

// Câncer: melanoma e câncer do sangue impedem para sempre; os outros, até 5 anos depois do tratamento, em remissão.
function analisarCancer(c: Coletor, detalhes: Mapa) {
  const fonte = "Anexo 1 (parte A)";
  if (detalhes.tipo === "grave") {
    c.inapto("condicoes.cancer", "Melanoma ou câncer do sangue (leucemia, linfoma, mieloma) impedem a doação", fonte);
  } else if (detalhes.tipo === "outro") {
    const fim = texto(detalhes.fim);
    if (detalhes.situacao === "emTratamento") {
      c.semData("condicoes.cancer", "Câncer em tratamento: é preciso esperar 5 anos depois do fim do tratamento, em remissão", fonte);
    } else if (fim) {
      c.ate("condicoes.cancer", "Câncer: é preciso esperar 5 anos depois do fim do tratamento", fonte, somarPrazo(fim, PRAZOS.cancerDepoisDoTratamento));
      c.avaliacao("condicoes.cancer.avaliacao", "A triagem vai confirmar se você está em remissão e sem doença ativa", fonte);
    }
  }
  // "leve" (basocelular de pele ou carcinoma in situ do colo do útero): não impede.
}

// ---------------------------------------------------------------- situações de risco, viagens e gestação (Art. 45, 57, 62 a 66)
function analisarRiscoViagemEGestacao(c: Coletor, r: Respostas, hoje: DataISO) {
  aplicarTabela(c, "riscoSexual", r.riscoSexual, RISCO_SEXUAL);

  for (const [opcao, detalhes] of Object.entries(mapa(r.drogas))) {
    if (opcao === "maconha") {
      // 12 horas de espera: sem horário, a pessoa volta no dia seguinte.
      c.ate("drogas.maconha", "Situação de risco nas últimas 12 horas", "Art. 62, § 6º", somarPrazo(hoje, PRAZOS.maconha));
      continue;
    }
    const regra = DROGAS[opcao];
    if (regra) aplicarRegra(c, `drogas.${opcao}`, regra, mapa(detalhes));
  }

  const dataMalaria = texto(r.malariaData);
  if (r.malaria === true && dataMalaria) {
    c.ate("malaria", "Viagem a área de malária, mata ou floresta, ou febre com suspeita de malária", "Art. 57", somarPrazo(dataMalaria, PRAZOS.malaria));
  }

  aplicarTabela(c, "gestacao", r.gestacao, GESTACAO);
}

// ---------------------------------------------------------------- resultado
const ORDEM: Record<TipoAchado, number> = { INAPTO: 0, TEMPORARIO: 1, AVALIACAO: 2 };
const SEM_DATA_PRIMEIRO = "9999-12-31";

const DICA_DO_DIA =
  "No dia da doação: leve documento oficial com foto, esteja descansado(a) e alimentado(a), beba bastante água, evite comida gordurosa nas 3 horas antes e bebida alcoólica nas 12 horas antes.";

function mensagemFinal(resultado: Resultado, liberadoEm: DataISO | null): string {
  switch (resultado) {
    case "APTO":
      return "Ótimo! Pelas suas respostas, você pode agendar a sua doação. A decisão final é da triagem no hemocentro.";
    case "AVALIACAO":
      return "Você pode agendar a sua doação. A triagem no hemocentro vai avaliar com você os pontos abaixo, e a decisão final é dela.";
    case "INAPTO_TEMPORARIO":
      return liberadoEm
        ? `No momento você não está apto(a) para realizar doações. O agendamento estará disponível a partir de ${formatarBr(liberadoEm)}.`
        : "No momento você não está apto(a) para realizar doações. Responda ao formulário de novo quando a situação abaixo mudar.";
    case "INAPTO":
      return "Pelas suas respostas, a doação de sangue não é indicada para você. Se tiver dúvidas, converse com a equipe de um hemocentro.";
  }
}

export function analisar(respostas: Respostas, contexto: ContextoAnalise): Analise {
  const { hoje } = contexto;
  const c = criarColetor(hoje);

  analisarDadosBasicos(c, respostas, contexto);
  analisarEstadoDeHoje(c, respostas);
  analisarEstetica(c, respostas);
  analisarRemediosEVacinas(c, respostas);
  analisarCirurgias(c, respostas);
  analisarDoencas(c, respostas);
  analisarRiscoViagemEGestacao(c, respostas, hoje);

  const motivos = [...c.achados].sort(
    (a, b) =>
      ORDEM[a.tipo] - ORDEM[b.tipo] ||
      (b.ate ?? SEM_DATA_PRIMEIRO).localeCompare(a.ate ?? SEM_DATA_PRIMEIRO) ||
      a.codigo.localeCompare(b.codigo),
  );

  const temporarios = motivos.filter((m) => m.tipo === "TEMPORARIO");
  let resultado: Resultado = "APTO";
  let liberadoEm: DataISO | null = null;

  if (motivos.some((m) => m.tipo === "INAPTO")) {
    resultado = "INAPTO";
  } else if (temporarios.length > 0) {
    resultado = "INAPTO_TEMPORARIO";
    // Só há data de retorno se todos os impedimentos tiverem data; vale a mais distante.
    if (temporarios.every((m) => m.ate)) liberadoEm = temporarios.map((m) => m.ate!).sort().at(-1)!;
  } else if (motivos.length > 0) {
    resultado = "AVALIACAO";
  }

  const avisos = [...new Set(c.avisos)];
  if (resultado === "APTO" || resultado === "AVALIACAO") avisos.push(DICA_DO_DIA);

  return { resultado, liberadoEm, mensagem: mensagemFinal(resultado, liberadoEm), motivos, avisos };
}

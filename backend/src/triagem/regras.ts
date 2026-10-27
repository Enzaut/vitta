// As regras do formulário (HU-03 / RN-001 a RN-004): prazos e decisões, todos num lugar só.
// Fonte: Portaria GM/MS nº 11.685/2026 (Anexo IV-B e Anexos 1 a 4), em vigor desde 30/9/2026.
// Para mudar um prazo, altere aqui e troque VERSAO_REGRAS em modelo.ts.
//
// "Art." e "Anexo" citam o regulamento técnico (Anexo IV-B). A conta que usa estas tabelas está em analisar.ts.
import type { Prazo } from "./datas";

// Impedimento com prazo: conta a partir da data que a pessoa informa.
export type RegraDePrazo = {
  motivo: string;
  fonte: string;
  prazo: Prazo;
  // Além do prazo, a triagem presencial avalia (ex.: o motivo da receita do remédio).
  avaliar?: string;
};

// Resultado direto, sem conta de data.
//  inapto: não pode doar e não há data de retorno; avaliacao: pode agendar, mas a triagem avalia;
//  temporario: não pode doar agora, sem data (volte a responder quando a situação mudar).
export type RegraDireta = { motivo: string; fonte: string; resultado: "inapto" | "avaliacao" | "temporario" };

export type Regra = RegraDePrazo | RegraDireta;

export const temPrazo = (regra: Regra): regra is RegraDePrazo => "prazo" in regra;

// ---------------------------------------------------------------- limites e prazos avulsos
export const LIMITES = {
  idadeMinima: 16, // Art. 39
  idadeMaximaPrimeiraDoacao: 60, // Art. 39, § 3º: 60 anos, 11 meses e 29 dias
  idadeMaxima: 69, // Art. 39: até 69 anos, 11 meses e 29 dias
  maioridade: 18, // menores de 18 levam autorização escrita do responsável (Art. 39, § 1º)
  pesoMinimoKg: 50, // Art. 40
  intervaloHomemMeses: 2, // Art. 38, § 1º
  intervaloMulherMeses: 3,
} as const;

export const PRAZOS = {
  // Art. 55 e Anexo 1 (parte B)
  gripeComFebre: { dias: 14 } satisfies Prazo, // febre de 38 °C ou mais, ou gripe (influenza): 2 semanas
  gripeSemFebre: { dias: 3 } satisfies Prazo, // resfriado comum: 3 dias
  // Anexo 2 (parte A) e Art. 66, VII
  procedimentoLocalSeguro: { dias: 7 } satisfies Prazo,
  procedimentoSemSeguranca: { meses: 4 } satisfies Prazo,
  // Art. 65: piercing na boca ou na região genital
  piercingBocaGenital: { meses: 4 } satisfies Prazo,
  transfusao: { meses: 4 } satisfies Prazo, // Art. 66, X
  ist: { meses: 12 } satisfies Prazo, // Art. 64, depois da cura
  malaria: { dias: 30 } satisfies Prazo, // Art. 57
  partoOuAborto: { dias: 84 } satisfies Prazo, // Art. 45: 12 semanas
  amamentacao: { meses: 12 } satisfies Prazo, // Art. 45, § 1º: parto há menos de 12 meses
  cancerDepoisDoTratamento: { anos: 5 } satisfies Prazo, // Anexo 1 (parte A)
  antirrabicaSemExposicao: { dias: 2 } satisfies Prazo, // Anexo 4
  antirrabicaComExposicao: { meses: 12 } satisfies Prazo,
  maconha: { dias: 1 } satisfies Prazo, // Art. 62, § 6º: 12 horas, arredondado para 1 dia
} as const;

// ---------------------------------------------------------------- tatuagem e procedimentos estéticos
export const PROCEDIMENTOS: Record<string, string> = {
  tatuagem: "Tatuagem",
  maquiagem: "Maquiagem definitiva",
  piercing: "Piercing",
  acupuntura: "Acupuntura",
  estetico: "Procedimento estético (botox, preenchimento ou microagulhamento)",
};

// ---------------------------------------------------------------- remédios (Anexo 3)
export const REMEDIOS: Record<string, Regra> = {
  antibiotico: { motivo: "Uso de antibiótico ou antifúngico", prazo: { dias: 14 }, fonte: "Anexo 3; Art. 53, § 2º" },
  corticoide: {
    motivo: "Uso de corticoide em comprimido ou injeção",
    prazo: { dias: 2 },
    fonte: "Anexo 3",
    avaliar: "A triagem vai avaliar a doença para a qual o corticoide foi usado.",
  },
  varfarina: {
    motivo: "Uso de varfarina ou heparina",
    prazo: { dias: 7 },
    fonte: "Anexo 3",
    avaliar: "A triagem vai avaliar o motivo da receita do anticoagulante.",
  },
  anticoagulanteNovo: {
    motivo: "Uso de anticoagulante (rivaroxabana, apixabana, dabigatrana, edoxabana ou enoxaparina)",
    prazo: { dias: 2 },
    fonte: "Anexo 3",
    avaliar: "A triagem vai avaliar o motivo da receita do anticoagulante.",
  },
  clopidogrel: {
    motivo: "Uso de clopidogrel ou ticlopidina",
    prazo: { dias: 14 },
    fonte: "Anexo 3",
    avaliar: "A triagem vai avaliar o motivo da receita do antiplaquetário.",
  },
  ticagrelor: {
    motivo: "Uso de ticagrelor",
    prazo: { dias: 7 },
    fonte: "Anexo 3",
    avaliar: "A triagem vai avaliar o motivo da receita do antiplaquetário.",
  },
  prasugrel: {
    motivo: "Uso de prasugrel",
    prazo: { dias: 3 },
    fonte: "Anexo 3",
    avaliar: "A triagem vai avaliar o motivo da receita do antiplaquetário.",
  },
  imunossupressor: {
    motivo: "Uso de imunossupressor, imunobiológico ou imunomodulador",
    prazo: { meses: 12 },
    fonte: "Anexo 3",
    avaliar: "A triagem vai avaliar o motivo do uso e eventuais sequelas.",
  },
  isotretinoina: { motivo: "Uso de isotretinoína", prazo: { meses: 1 }, fonte: "Anexo 3" },
  finasterida: { motivo: "Uso de finasterida", prazo: { meses: 1 }, fonte: "Anexo 3" },
  dutasterida: { motivo: "Uso de dutasterida", prazo: { meses: 6 }, fonte: "Anexo 3" },
  acitretina: { motivo: "Uso de acitretina", prazo: { anos: 3 }, fonte: "Anexo 3" },
  antipsicotico: { motivo: "Uso de antipsicótico", prazo: { dias: 7 }, fonte: "Anexo 3" },
  emagrecedor: { motivo: "Uso de remédio para emagrecer (anorexígeno)", prazo: { dias: 7 }, fonte: "Anexo 3" },
  testosterona: {
    motivo: "Uso de testosterona, anabolizante ou hormônio injetável sem receita",
    prazo: { meses: 4 },
    fonte: "Anexo 3; Art. 62, § 7º",
  },
  prepOral: { motivo: "Uso de PrEP ou PEP em comprimido", prazo: { meses: 4 }, fonte: "Anexo 3; Art. 66, XI" },
  prepInjetavel: { motivo: "Uso de PrEP injetável", prazo: { meses: 24 }, fonte: "Anexo 3; Art. 66, XI" },
  insulina: { motivo: "Uso de insulina (diabetes)", resultado: "inapto", fonte: "Anexo 1 (parte A)" },
  outro: { motivo: "Outro remédio: a triagem vai avaliar se ele impede a doação", resultado: "avaliacao", fonte: "Art. 44" },
};

// ---------------------------------------------------------------- vacinas (Anexo 4)
// A antirrábica depende de a pessoa ter sido exposta a um animal; essa conta fica em analisar.ts.
export const VACINAS: Record<string, Regra> = {
  viva: { motivo: "Vacina de vírus vivo", prazo: { dias: 28 }, fonte: "Anexo 4" },
  inativada: { motivo: "Vacina inativada", prazo: { dias: 2 }, fonte: "Anexo 4" },
  covid: { motivo: "Vacina contra a COVID-19", prazo: { dias: 7 }, fonte: "Anexo 4" },
  naoSei: { motivo: "Vacina recente que você não sabe qual é: a triagem vai avaliar", resultado: "avaliacao", fonte: "Anexo 4" },
};

// ---------------------------------------------------------------- cirurgias, exames e dentista (Anexo 2)
// "olho" e "pele" valem depois da alta ou da cicatrização (sem prazo fixo): ver analisar.ts.
export const CIRURGIAS: Record<string, Regra> = {
  endoscopia: { motivo: "Endoscopia ou colonoscopia", prazo: { meses: 4 }, fonte: "Art. 67, § 3º" },
  laparoscopia: { motivo: "Cirurgia por vídeo (laparoscopia)", prazo: { meses: 4 }, fonte: "Anexo 2" },
  pequena: { motivo: "Cirurgia pequena", prazo: { meses: 3 }, fonte: "Anexo 2" },
  media: { motivo: "Cirurgia de médio porte", prazo: { meses: 6 }, fonte: "Anexo 2" },
  grande: { motivo: "Cirurgia de grande porte", prazo: { meses: 12 }, fonte: "Anexo 2" },
  litotripsia: { motivo: "Litotripsia", prazo: { meses: 1 }, fonte: "Anexo 2" },
  outra: { motivo: "Outra cirurgia ou procedimento: a triagem vai avaliar", resultado: "avaliacao", fonte: "Art. 67" },
};

export const DENTISTA: Record<string, Regra> = {
  semAnestesia: { motivo: "Tratamento no dentista sem anestesia", prazo: { dias: 1 }, fonte: "Anexo 2 (parte B)" },
  limpeza: { motivo: "Limpeza de tártaro ou obturação", prazo: { dias: 3 }, fonte: "Anexo 2 (parte B)" },
  extracao: { motivo: "Extração, canal, abscesso, gengivite ou cirurgia no dentista", prazo: { dias: 7 }, fonte: "Anexo 2 (parte B)" },
  anestesiaGeral: { motivo: "Cirurgia no dentista com anestesia geral", prazo: { meses: 1 }, fonte: "Anexo 2 (parte B)" },
};

// ---------------------------------------------------------------- doenças e condições (Anexo 1)
// O câncer depende do tipo e do tempo de tratamento: ver analisar.ts.
// Infecções crônicas têm texto neutro de propósito: o resultado aparece na tela do celular.
const INFECCAO = "Infecção que impede a doação de sangue";

export const CONDICOES: Record<string, Regra> = {
  hepatite: { motivo: INFECCAO, resultado: "inapto", fonte: "Art. 54, I" },
  hiv: { motivo: INFECCAO, resultado: "inapto", fonte: "Art. 54, II" },
  chagas: { motivo: INFECCAO, resultado: "inapto", fonte: "Art. 59" },
  avc: { motivo: "AVC (derrame)", resultado: "inapto", fonte: "Anexo 1 (parte A)" },
  coracao: { motivo: "Doença grave do coração ou das artérias", resultado: "inapto", fonte: "Anexo 1 (parte A)" },
  diabetes: { motivo: "Diabetes tipo 1 ou que usa insulina", resultado: "inapto", fonte: "Anexo 1 (parte A)" },
  rim: { motivo: "Doença renal crônica", resultado: "inapto", fonte: "Anexo 1 (parte A)" },
  pulmao: { motivo: "Doença grave do pulmão ou asma grave", resultado: "inapto", fonte: "Anexo 1 (parte A)" },
  autoimune: { motivo: "Doença autoimune que afeta mais de um órgão", resultado: "inapto", fonte: "Anexo 1 (parte A)" },
  coagulacao: { motivo: "Doença hemorrágica ou da coagulação", resultado: "inapto", fonte: "Anexo 1 (parte A)" },
  hanseniase: { motivo: INFECCAO, resultado: "inapto", fonte: "Anexo 1 (parte A)" },
  anafilaxia: { motivo: "Choque anafilático (alergia grave)", resultado: "inapto", fonte: "Art. 50, § 1º" },
  cirurgiaGrave: { motivo: "Cirurgia ou transplante que impede a doação", resultado: "inapto", fonte: "Anexo 2 (parte A)" },
  // Anexo 1 (parte B) e Anexo 3 trazem regras diferentes para epilepsia; fica para o médico.
  epilepsia: { motivo: "Epilepsia ou convulsões: a triagem vai avaliar", resultado: "avaliacao", fonte: "Anexo 1 (parte B); Anexo 3" },
  outraCronica: { motivo: "Outra doença crônica: a triagem vai avaliar", resultado: "avaliacao", fonte: "Art. 43" },
};

// ---------------------------------------------------------------- situações de risco (Art. 62 a 66)
// Texto neutro de propósito: o resultado aparece na tela do celular.
const RISCO_RECENTE = "Situação de risco para infecções nos últimos 4 meses";
const PREFIRO_FALAR = "Você preferiu falar sobre isso na triagem: o profissional vai avaliar";

export const RISCO_SEXUAL: Record<string, Regra> = {
  parceiroNovo: { motivo: RISCO_RECENTE, prazo: { meses: 4 }, fonte: "Art. 66, IV" },
  parceiroOcasional: { motivo: RISCO_RECENTE, prazo: { meses: 4 }, fonte: "Art. 66, II" },
  trocaDinheiro: { motivo: RISCO_RECENTE, prazo: { meses: 4 }, fonte: "Art. 66, I" },
  parceiroInfectado: { motivo: RISCO_RECENTE, prazo: { meses: 4 }, fonte: "Art. 66, V" },
  violencia: { motivo: RISCO_RECENTE, prazo: { meses: 4 }, fonte: "Art. 66, III" },
  parceiroHemodialise: { motivo: RISCO_RECENTE, prazo: { meses: 4 }, fonte: "Art. 66, VIII" },
  prefiroFalar: { motivo: PREFIRO_FALAR, resultado: "avaliacao", fonte: "Art. 56" },
};

// "maconha" é tratada em analisar.ts (12 horas = até amanhã).
export const DROGAS: Record<string, Regra> = {
  injetavel: { motivo: "Situação de risco que impede a doação", resultado: "inapto", fonte: "Art. 62, § 4º; Art. 63, III" },
  cocainaCrack: { motivo: "Situação de risco nos últimos 12 meses", prazo: { meses: 12 }, fonte: "Art. 62, § 5º" },
  prefiroFalar: { motivo: PREFIRO_FALAR, resultado: "avaliacao", fonte: "Art. 62, § 1º" },
};

// ---------------------------------------------------------------- gestação e amamentação (Art. 45)
export const GESTACAO: Record<string, Regra> = {
  gravida: { motivo: "Gestação: só é possível doar 12 semanas depois do parto ou do aborto", resultado: "temporario", fonte: "Art. 45" },
  partoAborto: { motivo: "Parto ou aborto recente (12 semanas de espera)", prazo: PRAZOS.partoOuAborto, fonte: "Art. 45" },
  amamentando: { motivo: "Amamentação de bebê com menos de 12 meses", prazo: PRAZOS.amamentacao, fonte: "Art. 45, § 1º" },
};

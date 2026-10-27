// O formulário de análise (HU-03): as perguntas, na ordem em que o app mostra.
// É só a estrutura (textos, tipos de resposta e quando cada pergunta aparece).
// Os prazos e as decisões ficam em regras.ts, e a conta que junta tudo fica em analisar.ts.
//
// Base das perguntas: Portaria GM/MS nº 11.685/2026 (veja a pesquisa em documentos/pesquisa).
// O app baixa este modelo da API e monta as telas a partir dele.

// Regras conferidas na Portaria 11.685/2026, em vigor desde 30/9/2026.
// Mudou algum prazo? Altere regras.ts e esta versão: cada formulário guarda a versão com que foi calculado.
export const VERSAO_REGRAS = "2026-09-30";

// Quanto tempo vale um formulário respondido (RN-003). A triagem presencial repete tudo no dia da doação.
export const VALIDADE_DIAS = 30;

export type Valor = string | number | boolean;

// Quando uma pergunta aparece: compara com a resposta de outra pergunta do mesmo grupo.
export type Condicao = { id: string; igual: Valor } | { id: string; diferente: Valor } | { e: Condicao[] };

type Base = { id: string; rotulo: string; ajuda?: string; quando?: Condicao };

export type OpcaoEscolha = { id: string; rotulo: string };
export type CampoSimNao = Base & { tipo: "simNao" };
export type CampoEscolha = Base & { tipo: "escolha"; opcoes: OpcaoEscolha[] };
export type CampoData = Base & { tipo: "data" };
export type CampoSimples = CampoSimNao | CampoEscolha | CampoData;

// Marcar uma opção abre os campos dela (ex.: o dia em que tomou a última dose).
export type OpcaoMultipla = { id: string; rotulo: string; campos?: CampoSimples[] };
export type CampoMultipla = Base & { tipo: "multipla"; opcoes: OpcaoMultipla[]; nenhumRotulo: string };
export type CampoNumero = Base & { tipo: "numero"; unidade: string; minimo: number; maximo: number };
export type CampoDeclaracao = Base & { tipo: "declaracao" };

export type Campo = CampoSimples | CampoMultipla | CampoNumero | CampoDeclaracao;

export type Bloco = {
  id: string;
  titulo: string;
  introducao?: string;
  // Bloco com perguntas íntimas: o app avisa que as respostas são confidenciais.
  sensivel?: boolean;
  quando?: Condicao;
  campos: Campo[];
};

export type Modelo = { versaoRegras: string; validadeDias: number; blocos: Bloco[] };

// Respostas: pergunta -> valor. Em pergunta de marcar várias, o valor é { opção: { campo: valor } }
// (objeto vazio = "nenhuma destas"). Datas em AAAA-MM-DD.
export type Respostas = Record<string, unknown>;

// ---------------------------------------------------------------- atalhos para escrever o modelo
const simNao = (id: string, rotulo: string, extra: Partial<Base> = {}): CampoSimNao => ({ tipo: "simNao", id, rotulo, ...extra });
const data = (id: string, rotulo: string, extra: Partial<Base> = {}): CampoData => ({ tipo: "data", id, rotulo, ...extra });
const escolha = (id: string, rotulo: string, opcoes: OpcaoEscolha[], extra: Partial<Base> = {}): CampoEscolha => ({
  tipo: "escolha",
  id,
  rotulo,
  opcoes,
  ...extra,
});
const opcao = (id: string, rotulo: string, campos?: CampoSimples[]): OpcaoMultipla => ({ id, rotulo, ...(campos && { campos }) });

const SIM = { id: "sim", rotulo: "Sim" };
const NAO = { id: "nao", rotulo: "Não" };

// Remédio: a pessoa diz se ainda usa e, se parou, o dia da última dose.
const camposDeRemedio = (): CampoSimples[] => [
  escolha("situacao", "Você ainda usa?", [
    { id: "usando", rotulo: "Ainda uso" },
    { id: "parou", rotulo: "Parei" },
  ]),
  data("data", "Em que dia tomou a última dose?", { quando: { id: "situacao", igual: "parou" } }),
];

const camposComData = (rotulo: string): CampoSimples[] => [data("data", rotulo)];

// Tatuagem e parecidos: o dia e se o local era seguro (isso muda o prazo: 7 dias ou 4 meses).
const camposDeProcedimento = (): CampoSimples[] => [
  data("data", "Em que dia você fez?"),
  escolha(
    "seguro",
    "O local tinha licença da vigilância sanitária e usou material descartável ou esterilizado, aberto na sua frente?",
    [SIM, NAO, { id: "naoSei", rotulo: "Não sei" }],
    { ajuda: "Se não tiver certeza, escolha “Não sei”." },
  ),
];

export const MODELO: Modelo = {
  versaoRegras: VERSAO_REGRAS,
  validadeDias: VALIDADE_DIAS,
  blocos: [
    {
      id: "hoje",
      titulo: "Como você está hoje",
      introducao: "Responda pensando em como você está agora e nos últimos dias.",
      campos: [
        simNao("bemHoje", "Você está se sentindo bem e com saúde hoje?"),
        simNao("gripe", "Nos últimos 30 dias, você teve gripe, resfriado, febre ou tosse?"),
        simNao("gripeFebre", "Teve febre de 38 °C ou mais, ou um médico disse que era gripe (influenza)?", {
          quando: { id: "gripe", igual: true },
        }),
        escolha(
          "gripeSituacao",
          "Como estão os sintomas agora?",
          [
            { id: "ainda", rotulo: "Ainda tenho sintomas" },
            { id: "acabou", rotulo: "Os sintomas já acabaram" },
          ],
          { quando: { id: "gripe", igual: true } },
        ),
        data("gripeFim", "Em que dia os sintomas acabaram?", {
          quando: { e: [{ id: "gripe", igual: true }, { id: "gripeSituacao", igual: "acabou" }] },
        }),
        simNao("sinaisAlerta", "Você teve, sem explicação, algum destes sinais?", {
          ajuda:
            "Febre por mais de 10 dias · perda de mais de 10% do peso em 3 meses · suores noturnos · ínguas por mais de 30 dias · tosse ou falta de ar que não passa · diarreia que não passa.",
        }),
      ],
    },
    {
      id: "dados",
      titulo: "Seus dados",
      introducao: "Usamos estas informações só para calcular o seu resultado.",
      campos: [
        { tipo: "numero", id: "peso", rotulo: "Qual é o seu peso?", unidade: "kg", minimo: 20, maximo: 300 },
        escolha(
          "sexo",
          "Qual é o seu sexo?",
          [
            { id: "F", rotulo: "Feminino" },
            { id: "M", rotulo: "Masculino" },
            { id: "N", rotulo: "Prefiro não informar" },
          ],
          { ajuda: "Usamos só para calcular o intervalo entre doações e mostrar as perguntas certas." },
        ),
        simNao("jaDoou", "Você já doou sangue alguma vez?"),
        data("ultimaDoacao", "Quando foi a sua última doação de sangue?", { quando: { id: "jaDoou", igual: true } }),
      ],
    },
    {
      id: "estetica",
      titulo: "Tatuagem, piercing e procedimentos estéticos",
      campos: [
        {
          tipo: "multipla",
          id: "procedimentos",
          rotulo: "Nos últimos 4 meses, você fez algum destes procedimentos?",
          ajuda: "Marque todos que fez.",
          nenhumRotulo: "Nenhum destes",
          opcoes: (
            [
              ["tatuagem", "Tatuagem"],
              ["maquiagem", "Maquiagem definitiva (micropigmentação)"],
              ["piercing", "Piercing comum (orelha, nariz, umbigo...)"],
              ["acupuntura", "Acupuntura"],
              ["estetico", "Botox, preenchimento ou microagulhamento"],
            ] as const
          ).map(([id, rotulo]) => opcao(id, rotulo, camposDeProcedimento())),
        },
        escolha(
          "piercingBocaGenital",
          "Você tem piercing na boca ou na região genital, ou tirou um nos últimos 4 meses?",
          [
            { id: "nao", rotulo: "Não" },
            { id: "usando", rotulo: "Tenho piercing nessas regiões agora" },
            { id: "retirado", rotulo: "Tirei nos últimos 4 meses" },
          ],
        ),
        data("piercingRetirada", "Em que dia você tirou o piercing?", { quando: { id: "piercingBocaGenital", igual: "retirado" } }),
      ],
    },
    {
      id: "remedios",
      titulo: "Remédios e vacinas",
      introducao: "Não pare de tomar um remédio receitado só para poder doar. Converse com o seu médico.",
      campos: [
        {
          tipo: "multipla",
          id: "remedios",
          rotulo: "Você usa, ou usou recentemente, algum destes remédios?",
          ajuda:
            "Marque todos. Aspirina, paracetamol, dipirona, remédio de pressão (como losartana), de colesterol e a maioria dos antidepressivos não precisam ser marcados.",
          nenhumRotulo: "Nenhum destes",
          opcoes: [
            opcao("antibiotico", "Antibiótico ou antifúngico", camposDeRemedio()),
            opcao("corticoide", "Corticoide em comprimido ou injeção (como prednisona)", camposDeRemedio()),
            opcao("varfarina", "Varfarina ou heparina (anticoagulante)", camposDeRemedio()),
            opcao(
              "anticoagulanteNovo",
              "Rivaroxabana (Xarelto), apixabana (Eliquis), dabigatrana (Pradaxa), edoxabana ou enoxaparina (anticoagulante)",
              camposDeRemedio(),
            ),
            opcao("clopidogrel", "Clopidogrel (Plavix) ou ticlopidina", camposDeRemedio()),
            opcao("ticagrelor", "Ticagrelor (Brilinta)", camposDeRemedio()),
            opcao("prasugrel", "Prasugrel (Effient)", camposDeRemedio()),
            opcao("imunossupressor", "Imunossupressor, imunobiológico ou imunomodulador (por exemplo, para doença autoimune)", camposDeRemedio()),
            opcao("isotretinoina", "Isotretinoína (remédio de acne)", camposDeRemedio()),
            opcao("finasterida", "Finasterida (queda de cabelo ou próstata)", camposDeRemedio()),
            opcao("dutasterida", "Dutasterida (próstata)", camposDeRemedio()),
            opcao("acitretina", "Acitretina (psoríase)", camposDeRemedio()),
            opcao("antipsicotico", "Antipsicótico (como haloperidol, clorpromazina ou quetiapina)", camposDeRemedio()),
            opcao("emagrecedor", "Remédio para emagrecer (anorexígeno)", camposDeRemedio()),
            opcao("testosterona", "Testosterona, anabolizante ou hormônio injetável sem receita médica", camposDeRemedio()),
            opcao("prepOral", "PrEP ou PEP em comprimido (prevenção ao HIV)", camposDeRemedio()),
            opcao("prepInjetavel", "PrEP injetável (cabotegravir)", camposDeRemedio()),
            opcao("insulina", "Insulina"),
            opcao("outro", "Outro remédio que você usa todo dia ou usou há pouco tempo"),
          ],
        },
        {
          tipo: "multipla",
          id: "vacinas",
          rotulo: "Tomou alguma vacina nos últimos 30 dias?",
          ajuda: "Marque todas que tomou.",
          nenhumRotulo: "Nenhuma",
          opcoes: [
            opcao("viva", "Vacina de vírus vivo (febre amarela, tríplice viral, varicela, BCG, dengue, pólio oral...)", camposComData("Em que dia tomou?")),
            opcao("inativada", "Vacina inativada (gripe injetável, hepatite A ou B, tétano, HPV, pneumonia, herpes-zóster...)", camposComData("Em que dia tomou?")),
            opcao("covid", "Vacina contra a COVID-19", camposComData("Em que dia tomou?")),
            opcao("antirrabica", "Vacina antirrábica (se foi depois de mordida ou arranhão de animal, conte o último ano)", [
              data("data", "Em que dia tomou?"),
              simNao("aposAnimal", "Foi depois de mordida ou arranhão de animal?"),
            ]),
            opcao("naoSei", "Tomei uma vacina, mas não sei qual"),
          ],
        },
      ],
    },
    {
      id: "cirurgias",
      titulo: "Cirurgias, exames e dentista",
      campos: [
        {
          tipo: "multipla",
          id: "cirurgias",
          rotulo: "Nos últimos 12 meses, você fez alguma destas cirurgias ou exames?",
          ajuda: "Marque todas que fez.",
          nenhumRotulo: "Nenhuma destas",
          opcoes: [
            opcao("endoscopia", "Endoscopia ou colonoscopia", camposComData("Em que dia fez?")),
            opcao("laparoscopia", "Cirurgia por vídeo (laparoscopia)", camposComData("Em que dia fez?")),
            opcao("pequena", "Cirurgia pequena: apêndice, hemorroidas, hérnia, varizes, amígdalas ou plástica com anestesia local", camposComData("Em que dia fez?")),
            opcao(
              "media",
              "Cirurgia média: vesícula, útero, coluna, tireoide, nódulo de mama, bariátrica, ortopédica ou plástica com anestesia geral ou peridural",
              camposComData("Em que dia fez?"),
            ),
            opcao("grande", "Cirurgia grande: politrauma, parte do intestino (colectomia), rim, baço (depois de trauma) ou aneurisma", camposComData("Em que dia fez?")),
            opcao("litotripsia", "Litotripsia (pedra nos rins)", camposComData("Em que dia fez?")),
            opcao("olho", "Cirurgia de miopia ou catarata", [simNao("recuperado", "Você já teve alta do oftalmologista?")]),
            opcao("pele", "Retirada de verruga, unha, mancha ou outro pequeno procedimento de pele", [simNao("recuperado", "A ferida já cicatrizou?")]),
            opcao("outra", "Outra cirurgia ou procedimento invasivo"),
          ],
        },
        {
          tipo: "multipla",
          id: "dentista",
          rotulo: "Nos últimos 30 dias, você fez tratamento no dentista?",
          ajuda: "Marque o que fez.",
          nenhumRotulo: "Nenhum",
          opcoes: [
            opcao("semAnestesia", "Sem anestesia e sem sangramento (pequena cárie, ajuste de aparelho)", camposComData("Em que dia foi (ou o último dia do tratamento)?")),
            opcao("limpeza", "Limpeza de tártaro ou obturação (com anestesia local)", camposComData("Em que dia foi (ou o último dia do tratamento)?")),
            opcao("extracao", "Extração, canal, abscesso, gengivite ou cirurgia (com anestesia local)", camposComData("Em que dia foi (ou o último dia do tratamento)?")),
            opcao("anestesiaGeral", "Cirurgia com anestesia geral", camposComData("Em que dia terminou o tratamento?")),
          ],
        },
        simNao("transfusao", "Nos últimos 4 meses, você recebeu transfusão de sangue ou de componentes do sangue?"),
        data("transfusaoData", "Em que dia foi a transfusão?", { quando: { id: "transfusao", igual: true } }),
      ],
    },
    {
      id: "doencas",
      titulo: "Doenças e condições",
      campos: [
        {
          tipo: "multipla",
          id: "condicoes",
          rotulo: "Algum médico já disse que você tem ou já teve alguma destas?",
          ajuda: "Marque todas, em qualquer época da vida.",
          nenhumRotulo: "Nenhuma destas",
          opcoes: [
            opcao("hepatite", "Hepatite depois dos 13 anos de idade (exceto hepatite A)"),
            opcao("hiv", "HIV/aids ou HTLV"),
            opcao("chagas", "Doença de Chagas"),
            opcao("cancer", "Câncer", [
              escolha("tipo", "Que tipo?", [
                { id: "grave", rotulo: "Melanoma ou câncer do sangue (leucemia, linfoma, mieloma)" },
                { id: "outro", rotulo: "Outro tipo de câncer" },
                { id: "leve", rotulo: "Câncer de pele basocelular ou carcinoma in situ do colo do útero" },
              ]),
              escolha(
                "situacao",
                "Como está o tratamento?",
                [
                  { id: "emTratamento", rotulo: "Ainda em tratamento" },
                  { id: "terminou", rotulo: "Já terminou" },
                ],
                { quando: { id: "tipo", igual: "outro" } },
              ),
              data("fim", "Em que dia terminou o tratamento?", { quando: { e: [{ id: "tipo", igual: "outro" }, { id: "situacao", igual: "terminou" }] } }),
            ]),
            opcao("avc", "AVC (derrame)"),
            opcao("coracao", "Doença grave do coração ou das artérias (coronária, angina, arritmia grave, insuficiência cardíaca, aneurisma, trombose repetida)"),
            opcao("diabetes", "Diabetes tipo 1, ou diabetes que usa insulina"),
            opcao("epilepsia", "Epilepsia ou convulsões"),
            opcao("rim", "Doença renal crônica"),
            opcao("pulmao", "Doença grave do pulmão (enfisema, DPOC) ou asma grave"),
            opcao("autoimune", "Doença autoimune que afeta mais de um órgão (lúpus, artrite reumatoide...)"),
            opcao("coagulacao", "Doença hemorrágica ou da coagulação (como hemofilia)"),
            opcao("hanseniase", "Hanseníase"),
            opcao("anafilaxia", "Choque anafilático (alergia grave)"),
            opcao("cirurgiaGrave", "Cirurgia no coração, retirada total do estômago, de um pulmão ou lobo, do baço (sem ser por trauma), ou transplante"),
            opcao("outraCronica", "Outra doença crônica"),
          ],
        },
        simNao("ist", "Nos últimos 12 meses, você teve sífilis, gonorreia ou outra infecção sexualmente transmissível?"),
        escolha(
          "istSituacao",
          "Como está o tratamento?",
          [
            { id: "tratando", rotulo: "Ainda estou em tratamento" },
            { id: "curado", rotulo: "O tratamento terminou e fui liberado(a)" },
          ],
          { quando: { id: "ist", igual: true } },
        ),
        data("istCura", "Em que dia o tratamento terminou?", { quando: { e: [{ id: "ist", igual: true }, { id: "istSituacao", igual: "curado" }] } }),
      ],
    },
    {
      id: "risco",
      titulo: "Situações de risco",
      introducao:
        "Estas perguntas são sobre comportamentos e datas, não sobre quem você é. As respostas são confidenciais e servem só para calcular o seu resultado. Se preferir, escolha “Prefiro falar na triagem”.",
      sensivel: true,
      campos: [
        {
          tipo: "multipla",
          id: "riscoSexual",
          rotulo: "Nos últimos 4 meses, aconteceu algum destes casos com você ou com seu parceiro ou parceira?",
          ajuda: "Marque todos que se aplicam.",
          nenhumRotulo: "Nenhum destes",
          opcoes: [
            opcao("parceiroNovo", "Começou uma relação nova (conte a partir do primeiro contato sexual)", camposComData("Em que dia foi o primeiro contato?")),
            opcao("parceiroOcasional", "Teve relação sexual com parceiro ou parceira ocasional ou desconhecido(a)", camposComData("Em que dia foi a última vez?")),
            opcao("trocaDinheiro", "Teve relação sexual em troca de dinheiro ou de drogas", camposComData("Em que dia foi a última vez?")),
            opcao(
              "parceiroInfectado",
              "Teve relação sexual com pessoa com HIV, hepatite B ou C ou outra infecção de transmissão sexual e pelo sangue",
              camposComData("Em que dia foi a última vez?"),
            ),
            opcao("violencia", "Sofreu violência sexual", camposComData("Em que dia foi?")),
            opcao(
              "parceiroHemodialise",
              "É parceiro ou parceira de pessoa em hemodiálise ou que recebeu transfusão de sangue",
              camposComData("Em que dia foi o último contato?"),
            ),
            opcao("prefiroFalar", "Prefiro falar sobre isso na triagem"),
          ],
        },
        {
          tipo: "multipla",
          id: "drogas",
          rotulo: "Você usou alguma destas drogas?",
          ajuda: "Marque todas que se aplicam.",
          nenhumRotulo: "Nenhuma destas",
          opcoes: [
            opcao("injetavel", "Já usei droga injetável sem receita médica, em qualquer época"),
            opcao("cocainaCrack", "Usei cocaína ou crack inalados nos últimos 12 meses", camposComData("Em que dia foi a última vez?")),
            opcao("maconha", "Usei maconha nas últimas 12 horas"),
            opcao("prefiroFalar", "Prefiro falar sobre isso na triagem"),
          ],
        },
      ],
    },
    {
      id: "viagens",
      titulo: "Viagens e malária",
      campos: [
        simNao(
          "malaria",
          "Nos últimos 30 dias, você esteve em município de área de malária (como na região amazônica), em mata, bosque ou floresta, ou teve febre com suspeita de malária?",
        ),
        data("malariaData", "Em que dia você voltou (ou teve a febre)?", { quando: { id: "malaria", igual: true } }),
      ],
    },
    {
      id: "gestacao",
      titulo: "Gestação e amamentação",
      quando: { id: "sexo", diferente: "M" },
      campos: [
        {
          tipo: "multipla",
          id: "gestacao",
          rotulo: "Alguma destas situações vale para você?",
          ajuda: "Marque todas que se aplicam.",
          nenhumRotulo: "Nenhuma destas",
          opcoes: [
            opcao("gravida", "Estou grávida"),
            opcao("partoAborto", "Tive parto ou aborto nos últimos 3 meses", camposComData("Em que dia foi?")),
            opcao("amamentando", "Estou amamentando bebê com menos de 12 meses", camposComData("Em que dia o bebê nasceu?")),
          ],
        },
      ],
    },
    {
      id: "final",
      titulo: "Para terminar",
      campos: [
        {
          tipo: "declaracao",
          id: "declaracao",
          rotulo:
            "Respondi com sinceridade, entendi que a decisão final é da triagem presencial no hemocentro e autorizo o VITTA a guardar estas respostas para calcular o meu resultado.",
        },
      ],
    },
  ],
};

// Uma condição é verdadeira? (Pergunta ainda sem resposta nunca é igual a nada.)
export function condicaoAtendida(condicao: Condicao | undefined, escopo: Record<string, unknown>): boolean {
  if (!condicao) return true;
  if ("e" in condicao) return condicao.e.every((c) => condicaoAtendida(c, escopo));
  const valor = escopo[condicao.id];
  return "igual" in condicao ? valor === condicao.igual : valor !== condicao.diferente;
}

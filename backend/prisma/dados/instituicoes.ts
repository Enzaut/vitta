// Dados iniciais das instituições do mapa (HU-05). Entram no banco com `npm run seed`
// (e sozinhos quando a API sobe pelo Docker). Para incluir ou corrigir uma instituição, mexa só aqui.
//
// Duas listas, de propósito separadas:
//  1) INSTITUICOES_REAIS: lugares que existem de verdade, com dados tirados de página oficial (fonte e data abaixo).
//  2) INSTITUICOES_DEMONSTRACAO: lugares de EXEMPLO, só para mostrar o mapa e o raio de busca no trabalho.
//     Não existem, os endereços são de mentira e o estoque é inventado. O app mostra o aviso "Demonstração".
//     Para tirar da API sem apagar o arquivo: INSTITUICOES_DEMO=false npm run seed
import type { TipoSanguineoTexto } from "../../src/utils/tipoSanguineo";

export type DadosInstituicao = {
  codigo: string;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string | null;
  horario: string;
  latitude: number;
  longitude: number;
  tiposEmFalta: TipoSanguineoTexto[];
  // Quando o estoque foi informado (AAAA-MM-DD). Nulo = a instituição não informa o estoque.
  estoqueAtualizadoEm: string | null;
  demonstracao: boolean;
  fonte: string | null;
};

// ---------------------------------------------------------------- instituições reais
export const INSTITUICOES_REAIS: DadosInstituicao[] = [
  {
    codigo: "hemocentro-de-brasilia",
    nome: "Hemocentro de Brasília",
    // Endereço e horário: https://www.fhb.df.gov.br/localizacao e rodapé do site (consultados em 26/10/2026).
    endereco: "SMHN, Quadra 3, Conjunto A, Bloco 3, Asa Norte, Brasília - DF, CEP 70710-908 (perto do HRAN e da Fepecs)",
    cidade: "Brasília",
    uf: "DF",
    // Telefone da Fundação Hemocentro de Brasília: https://www.fhb.df.gov.br/unidades-conveniadas (consultado em 26/10/2026).
    telefone: "(61) 3327-4413",
    horario: "Segunda a sábado, das 7h15 às 18h. Doação com agendamento: agenda.df.gov.br ou telefone 160, opção 2.",
    // Coordenada do prédio no OpenStreetMap (way 136363094), consultada em 26/10/2026.
    latitude: -15.784637,
    longitude: -47.8858931,
    // A Fundação não publica o estoque em tempo real: sem informação.
    tiposEmFalta: [],
    estoqueAtualizadoEm: null,
    demonstracao: false,
    fonte: "https://www.fhb.df.gov.br/localizacao",
  },
];

// ---------------------------------------------------------------- instituições de demonstração (NÃO EXISTEM)
const AVISO_ENDERECO = "Endereço de demonstração";
const HORARIO_DEMO = "Horário de demonstração: segunda a sexta, das 8h às 17h";

const demonstracao = (
  codigo: string,
  cidade: string,
  latitude: number,
  longitude: number,
  tiposEmFalta: TipoSanguineoTexto[],
): DadosInstituicao => ({
  codigo: `demo-${codigo}`,
  nome: `Posto de coleta ${cidade} (demonstração)`,
  endereco: `${AVISO_ENDERECO}, ${cidade} - DF`,
  cidade,
  uf: "DF",
  telefone: null,
  horario: HORARIO_DEMO,
  // Coordenadas aproximadas do centro de cada região, só para o mapa ter pontos espalhados pelo DF.
  latitude,
  longitude,
  tiposEmFalta,
  estoqueAtualizadoEm: "2026-10-26",
  demonstracao: true,
  fonte: null,
});

export const INSTITUICOES_DEMONSTRACAO: DadosInstituicao[] = [
  demonstracao("aguas-claras", "Águas Claras", -15.8388, -48.0267, ["O-"]),
  demonstracao("taguatinga", "Taguatinga", -15.833, -48.058, ["O-", "A-"]),
  demonstracao("ceilandia", "Ceilândia", -15.8189, -48.104, ["B-"]),
  demonstracao("samambaia", "Samambaia", -15.876, -48.088, []),
  demonstracao("gama", "Gama", -16.0156, -48.0614, ["O+", "O-", "AB-"]),
  demonstracao("sobradinho", "Sobradinho", -15.6521, -47.7894, ["A+", "B+"]),
  demonstracao("planaltina", "Planaltina", -15.6178, -47.6493, ["O-"]),
];

export const INSTITUICOES: DadosInstituicao[] = [...INSTITUICOES_REAIS, ...INSTITUICOES_DEMONSTRACAO];

import type { Instituicao } from "../api/instituicoes";
import type { Posicao } from "../localizacao/estado";
import type { Alvo } from "./geografia";

// O que o mapa recebe. O mapa de verdade (react-native-maps) só existe no celular,
// por isso há dois arquivos com este mesmo contrato: MapaInstituicoes.tsx e MapaInstituicoes.web.tsx.
export type PropsDoMapa = {
  posicao: Posicao;
  raioKm: number;
  // Vista com que o mapa abre: centrada na pessoa, mostrando o raio inteiro.
  vistaInicial: Alvo;
  // Quando muda, o mapa se move até esta vista (raio novo, "Perto de mim", instituição escolhida na busca).
  alvo: Alvo | null;
  instituicoes: Instituicao[];
  aoAbrir: (instituicao: Instituicao) => void;
};

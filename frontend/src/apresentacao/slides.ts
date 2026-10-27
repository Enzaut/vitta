import type { Ionicons } from "@expo/vector-icons";
import type { NomeDaIlustracao } from "./ilustracoes";

// O que o carrossel de boas-vindas diz, tela por tela. Para mudar um texto, é só editar aqui.
// Os números e as regras vêm de fontes oficiais (Ministério da Saúde e CLT), citadas na linha "fonte".

type Icone = keyof typeof Ionicons.glyphMap;

export type Item = {
  icone: Icone;
  texto: string;
  // Marca o passo como "em breve" (ainda não existe no app). Quando ele entrar, é só tirar esta linha.
  emBreve?: boolean;
};

export type Slide = {
  id: string;
  ilustracao: NomeDaIlustracao;
  // As palavras entre *asteriscos* ficam em vermelho. Os espaços sem quebra (\u00A0) mantêm o trecho junto na mesma linha.
  titulo: string;
  texto?: string;
  itens?: Item[];
  // Linha pequena no fim, dizendo de onde vem a informação.
  fonte?: string;
};

export const SLIDES: Slide[] = [
  {
    id: "ideia",
    ilustracao: "boasVindas",
    titulo: "Oi! A gente é o *VITTA*",
    texto:
      "O app existe pra deixar a doação de sangue mais fácil e mais divertida. Você encontra onde doar e, quanto mais doa, mais pontos e recompensas ganha.",
  },
  {
    id: "vidas",
    ilustracao: "quatroVidas",
    titulo: "Uma doação salva *até\u00A04\u00A0vidas*",
    texto:
      "Depois da coleta, o sangue é separado em partes: hemácias, plaquetas, plasma... Cada parte ajuda uma pessoa diferente, como quem passa por uma cirurgia, sofre um acidente ou faz tratamento de câncer.",
    fonte: "Fonte: Ministério da Saúde",
  },
  {
    id: "estoque",
    ilustracao: "naoSeFabrica",
    titulo: "Sangue *não se fabrica*",
    texto:
      "Não existe remédio nem máquina que faça sangue: ele só vem de gente como você. E dura pouco: as plaquetas servem por uns 5 dias e as hemácias por uns 42. Por isso o hemocentro precisa de doação o ano inteiro, e hoje menos de 2% dos brasileiros doam.",
    fonte: "Fonte: Ministério da Saúde",
  },
  {
    id: "vantagens",
    ilustracao: "vantagens",
    titulo: "Doar também *vale\u00A0a\u00A0pena* pra você",
    itens: [
      { icone: "pulse-outline", texto: "Antes de doar tem uma triagem, que confere seu pulso, sua pressão e sua hemoglobina." },
      { icone: "shield-checkmark-outline", texto: "Todo o material é novo e descartável, então doar é seguro: ninguém pega doença doando." },
      { icone: "calendar-outline", texto: "Quem tem carteira assinada pode faltar 1 dia a cada 12 meses pra doar, sem desconto no salário." },
    ],
    fonte: "Folga prevista na CLT (art. 473). É só levar o comprovante da doação.",
  },
  {
    id: "passos",
    ilustracao: "comoFunciona",
    titulo: "Como o VITTA *funciona*",
    itens: [
      { icone: "clipboard-outline", texto: "Você responde umas perguntinhas rápidas pra descobrir se já pode doar." },
      { icone: "map-outline", texto: "O mapa mostra os hemocentros mais perto e quais tipos de sangue estão em falta." },
      { icone: "calendar-outline", texto: "Você agenda o horário que for melhor pra você.", emBreve: true },
      { icone: "trophy-outline", texto: "Você doa, junta pontos e troca por recompensas.", emBreve: true },
    ],
  },
  {
    id: "comecar",
    ilustracao: "comecar",
    titulo: "Bora *começar*?",
    texto:
      "Crie sua conta em um minutinho e responda ao questionário pra saber se você já pode doar. A coleta leva uns 10 minutos, e o seu sangue pode ser a diferença pra alguém.",
  },
];

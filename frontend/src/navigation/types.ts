import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Instituicao } from "../api/instituicoes";

// As abas de baixo (só para quem já entrou).
export type AbasParamList = {
  Inicio: undefined;
  Mapa: undefined;
  Perfil: undefined;
};

// Telas do app e os parâmetros de cada uma.
export type RootStackParamList = {
  // Quem ainda não entrou
  BoasVindas: undefined;
  Cadastro: undefined;
  Login: undefined;
  // Quem já entrou
  Abas: NavigatorScreenParams<AbasParamList> | undefined;
  Dados: undefined;
  Privacidade: undefined;
  // HU-03: formulário de elegibilidade
  FormularioIntro: undefined;
  Formulario: undefined;
  ResultadoFormulario: undefined;
  // HU-05: detalhes de uma instituição (o app já tem os dados da lista, então passa a instituição inteira)
  Instituicao: { instituicao: Instituicao };
  // Carrossel de boas-vindas visto de novo (a primeira vez ele aparece antes de tudo, fora da navegação)
  Apresentacao: undefined;
};

// Tela que fica numa aba: pode ir para as outras abas e para as telas da pilha.
export type AbaProps<Aba extends keyof AbasParamList> = CompositeScreenProps<
  BottomTabScreenProps<AbasParamList, Aba>,
  NativeStackScreenProps<RootStackParamList>
>;

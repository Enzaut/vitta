import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApresentacaoCarrossel } from "../apresentacao/ApresentacaoCarrossel";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Apresentacao">;

// A apresentação de boas-vindas vista de novo, aberta pelo Perfil ("Como o VITTA funciona").
export function ApresentacaoScreen({ navigation }: Props) {
  return <ApresentacaoCarrossel aoConcluir={() => navigation.goBack()} textoFinal="Voltar ao app" textoPular="Fechar" />;
}

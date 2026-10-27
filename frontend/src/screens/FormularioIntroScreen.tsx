import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { formatarDataBr } from "../validation/campos";

type Props = NativeStackScreenProps<RootStackParamList, "FormularioIntro">;

// HU-03: o que é o formulário, antes de começar. Aparece logo depois do cadastro (HU-01, cenário 1).
export function FormularioIntroScreen({ navigation }: Props) {
  const { aviso, limparAviso, formulario } = useAuth();

  return (
    <Tela>
      <Text style={estilos.titulo}>Formulário de elegibilidade</Text>
      <Text style={estilos.subtitulo}>Vamos conferir se você já pode doar sangue.</Text>

      {aviso && <Aviso tipo={aviso.tipo} texto={aviso.texto} aoFechar={limparAviso} />}

      <View style={estilos.cartao}>
        <Ionicons name="information-circle-outline" size={26} color={cores.primaria} />
        <Text style={estilos.cartaoTitulo}>Como funciona</Text>
        <Linha texto="São perguntas rápidas sobre a sua saúde e os últimos meses. Leva alguns minutos." />
        <Linha texto="É uma pré-análise: a decisão final é sempre da triagem presencial no hemocentro, feita por um profissional de saúde." />
        <Linha texto="No fim, você vê se já pode agendar ou a partir de que dia." />
        <Linha texto="Responda com sinceridade: isso protege você e quem vai receber o sangue." />
      </View>

      <View style={estilos.cartao}>
        <Ionicons name="lock-closed-outline" size={26} color={cores.primaria} />
        <Text style={estilos.cartaoTitulo}>Sua privacidade</Text>
        <Linha texto="As respostas são confidenciais: só você as vê no app." />
        <Linha texto="Guardamos só o necessário para calcular o seu resultado e apagamos tudo se você excluir a conta." />
      </View>

      {formulario && (
        <Text style={estilos.nota}>
          Você já respondeu este formulário e ele vale até {formatarDataBr(formulario.validoAte)}. Responder de novo substitui o anterior.
        </Text>
      )}

      <Botao titulo={formulario ? "Responder de novo" : "Começar"} aoPressionar={() => navigation.navigate("Formulario")} />
    </Tela>
  );
}

const Linha = ({ texto }: { texto: string }) => (
  <View style={estilos.linha}>
    <Text style={estilos.marcador}>•</Text>
    <Text style={estilos.linhaTexto}>{texto}</Text>
  </View>
);

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo + 2, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 20 },
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 8, marginBottom: 16 },
  cartaoTitulo: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  linha: { flexDirection: "row", gap: 8 },
  marcador: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.primaria, lineHeight: 20 },
  linhaTexto: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
  nota: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, marginBottom: 16, lineHeight: 19 },
});

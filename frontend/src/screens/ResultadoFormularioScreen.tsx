import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import { APARENCIA, formatarDataHora } from "../formulario/aparencia";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { formatarDataBr } from "../validation/campos";

type Props = NativeStackScreenProps<RootStackParamList, "ResultadoFormulario">;

// HU-03: o resultado do formulário (cenários 1 e 2).
export function ResultadoFormularioScreen({ navigation }: Props) {
  const { formulario } = useAuth();

  if (!formulario) {
    return (
      <Tela centralizar>
        <ActivityIndicator size="large" color={cores.primaria} />
      </Tela>
    );
  }

  const visual = APARENCIA[formulario.resultado];
  const temporarioComData = formulario.resultado === "INAPTO_TEMPORARIO" && formulario.liberadoEm;

  return (
    <Tela>
      <View style={[estilos.cartao, { backgroundColor: visual.fundo, borderColor: visual.cor }]} accessibilityRole="summary">
        <Ionicons name={visual.icone} size={40} color={visual.cor} />
        <Text style={[estilos.titulo, { color: visual.cor }]}>{visual.titulo}</Text>
        <Text style={estilos.mensagem}>{formulario.mensagem}</Text>
        {temporarioComData && (
          <Text style={[estilos.data, { color: visual.cor }]}>A partir de {formatarDataBr(formulario.liberadoEm!)}</Text>
        )}
      </View>

      {formulario.motivos.length > 0 && (
        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>{formulario.resultado === "AVALIACAO" ? "A triagem vai avaliar" : "Motivos"}</Text>
          {formulario.motivos.map((motivo) => (
            <View key={motivo.codigo} style={estilos.item}>
              <Text style={estilos.marcador}>•</Text>
              <Text style={estilos.itemTexto}>{motivo.mensagem}</Text>
            </View>
          ))}
        </View>
      )}

      {formulario.avisos.length > 0 && (
        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Importante</Text>
          {formulario.avisos.map((aviso) => (
            <View key={aviso} style={estilos.item}>
              <Text style={estilos.marcador}>•</Text>
              <Text style={estilos.itemTexto}>{aviso}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={estilos.validade}>
        Respondido em {formatarDataHora(formulario.preenchidoEm)}. Vale até {formatarDataBr(formulario.validoAte)}. Se algo mudar antes da doação
        (doença, remédio, vacina, tatuagem), responda de novo.
      </Text>

      <View style={estilos.botoes}>
        <Botao titulo="Voltar ao início" aoPressionar={() => navigation.popToTop()} />
        <Botao titulo="Responder de novo" variante="secundario" aoPressionar={() => navigation.navigate("Formulario")} />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  cartao: { borderRadius: raio, borderWidth: 1.5, padding: 20, gap: 8, alignItems: "flex-start", marginBottom: 24 },
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo },
  mensagem: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.texto, lineHeight: 23 },
  data: { fontFamily: fontes.titulo, fontSize: 18, marginTop: 4 },
  secao: { marginBottom: 20, gap: 8 },
  secaoTitulo: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  item: { flexDirection: "row", gap: 8 },
  marcador: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.primaria, lineHeight: 22 },
  itemTexto: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario + 1, color: cores.texto, lineHeight: 22 },
  validade: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 19, marginBottom: 24 },
  botoes: { gap: 12 },
});

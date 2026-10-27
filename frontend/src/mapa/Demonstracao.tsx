import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { cores, fontes, raio } from "../theme";

// As instituições de demonstração não existem de verdade. O app sempre deixa isso claro.

export function EtiquetaDemonstracao() {
  return (
    <View style={estilos.etiqueta}>
      <Text style={estilos.etiquetaTexto}>DEMONSTRAÇÃO</Text>
    </View>
  );
}

export function NotaDemonstracao() {
  return (
    <View style={estilos.nota} accessibilityRole="summary">
      <Ionicons name="information-circle" size={22} color="#9A7400" />
      <Text style={estilos.notaTexto}>
        Instituição de demonstração. Nome, endereço e estoque são fictícios e servem só para testar o aplicativo.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: { alignSelf: "flex-start", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "#FFF6DD", borderWidth: 1, borderColor: "#9A7400" },
  etiquetaTexto: { fontFamily: fontes.botao, fontSize: 11, color: "#7A5A00", letterSpacing: 0.4 },
  nota: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: raio, backgroundColor: "#FFF6DD", borderWidth: 1, borderColor: "#9A7400", marginBottom: 16 },
  notaTexto: { flex: 1, fontFamily: fontes.texto, fontSize: 14, color: "#5C4300", lineHeight: 20 },
});

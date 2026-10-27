import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { cores, fontes } from "../theme";
import type { PropsDoMapa } from "./tiposDoMapa";

// No navegador não há mapa (a biblioteca react-native-maps só funciona no celular).
// Este quadro ocupa o lugar dele e mostra um "marcador" tocável por instituição, para dar para testar o fluxo na web.
export function MapaInstituicoes({ raioKm, instituicoes, aoAbrir }: PropsDoMapa) {
  return (
    <View style={estilos.caixa} accessibilityLabel="Área do mapa, indisponível no navegador">
      <Ionicons name="map-outline" size={32} color={cores.textoSecundario} />
      <Text style={estilos.titulo}>O mapa aparece no aplicativo, no celular.</Text>
      <Text style={estilos.texto}>
        {instituicoes.length} marcador(es) dentro de {raioKm} km:
      </Text>
      <View style={estilos.marcadores}>
        {instituicoes.map((instituicao) => (
          <Pressable
            key={instituicao.id}
            onPress={() => aoAbrir(instituicao)}
            accessibilityRole="button"
            accessibilityLabel={`Marcador: ${instituicao.nome}`}
            style={estilos.marcador}
          >
            <Ionicons name="location" size={14} color={cores.primaria} />
            <Text style={estilos.marcadorTexto} numberOfLines={1}>
              {instituicao.nome}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 12, backgroundColor: "#E9EEF2" },
  titulo: { fontFamily: fontes.subtitulo, fontSize: 15, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario },
  marcadores: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  marcador: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: "#FFFFFF", maxWidth: 220 },
  marcadorTexto: { fontFamily: fontes.texto, fontSize: 12, color: cores.texto },
});

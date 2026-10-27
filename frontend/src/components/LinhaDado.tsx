import { StyleSheet, Text, View } from "react-native";
import { cores, fontes, tamanhos } from "../theme";

// Uma informação com rótulo em cima e valor embaixo (usada no perfil e na tela de dados).
export function LinhaDado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linha} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { gap: 2 },
  rotulo: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario },
  valor: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.texto },
});

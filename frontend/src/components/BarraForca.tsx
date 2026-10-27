import { StyleSheet, Text, View } from "react-native";
import { cores, fontes, tamanhos } from "../theme";
import { forcaDaSenha } from "../validation/campos";

// Indicador de força da senha: três trechos que ficam vermelho, amarelo ou verde.
export function BarraForca({ senha }: { senha: string }) {
  const { nivel, rotulo, cor } = forcaDaSenha(senha);
  if (nivel === 0) return null;

  return (
    <View style={estilos.linha} accessibilityLabel={`Força da senha: ${rotulo}`}>
      <View style={estilos.barras}>
        {[1, 2, 3].map((posicao) => (
          <View key={posicao} style={[estilos.trecho, { backgroundColor: posicao <= nivel ? cor : cores.borda }]} />
        ))}
      </View>
      <Text style={estilos.rotulo}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: -8, marginBottom: 16 },
  barras: { flex: 1, flexDirection: "row", gap: 6 },
  trecho: { flex: 1, height: 6, borderRadius: 3 },
  rotulo: { width: 52, fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.texto },
});

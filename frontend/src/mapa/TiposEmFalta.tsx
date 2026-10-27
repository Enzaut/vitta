import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { Instituicao } from "../api/instituicoes";
import { cores, fontes } from "../theme";
import { falarTipo } from "./geografia";

type Props = Pick<Instituicao, "tiposEmFalta" | "estoqueAtualizadoEm">;

// Estoque da instituição. O ícone de exclamação vermelho aparece só nos tipos em falta (RN08).
export function TiposEmFalta({ tiposEmFalta, estoqueAtualizadoEm }: Props) {
  if (tiposEmFalta.length > 0) {
    return (
      <View
        style={estilos.linha}
        accessible
        accessibilityLabel={`Tipos sanguíneos em falta: ${tiposEmFalta.map(falarTipo).join(", ")}`}
      >
        <Text style={estilos.rotulo}>Em falta:</Text>
        {tiposEmFalta.map((tipo) => (
          <View key={tipo} style={estilos.etiqueta}>
            <Ionicons name="alert-circle" size={14} color={cores.erro} />
            <Text style={estilos.tipo}>{tipo}</Text>
          </View>
        ))}
      </View>
    );
  }

  // Lista vazia com data: a instituição informou o estoque e nada está em falta.
  if (estoqueAtualizadoEm) {
    return (
      <View style={estilos.linha}>
        <Ionicons name="checkmark-circle" size={16} color={cores.sucesso} />
        <Text style={[estilos.rotulo, { color: cores.sucesso }]}>Nenhum tipo em falta no momento</Text>
      </View>
    );
  }

  return <Text style={estilos.rotulo}>Estoque não informado pela instituição</Text>;
}

const estilos = StyleSheet.create({
  linha: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: 14, color: cores.textoSecundario },
  etiqueta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: cores.fundoErro,
    borderWidth: 1,
    borderColor: cores.erro,
  },
  tipo: { fontFamily: fontes.botao, fontSize: 13, color: cores.primariaEscura },
});

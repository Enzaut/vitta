import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Instituicao } from "../api/instituicoes";
import { cores, fontes, raio, tamanhos } from "../theme";
import { EtiquetaDemonstracao } from "./Demonstracao";
import { falarTipo, formatarDistancia } from "./geografia";
import { TiposEmFalta } from "./TiposEmFalta";

type Props = {
  instituicao: Instituicao;
  aoPressionar: () => void;
};

// Card da lista (HU-05, cenário 1): nome, horário, endereço e tipos sanguíneos em falta.
export function CartaoInstituicao({ instituicao, aoPressionar }: Props) {
  const { nome, endereco, horario, distanciaKm, tiposEmFalta, estoqueAtualizadoEm, demonstracao } = instituicao;
  const distancia = distanciaKm === null ? null : formatarDistancia(distanciaKm);

  const descricao = [
    nome,
    demonstracao ? "instituição de demonstração" : null,
    distancia ? `a ${distancia}` : null,
    `horário: ${horario}`,
    tiposEmFalta.length > 0 ? `em falta: ${tiposEmFalta.map(falarTipo).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      onPress={aoPressionar}
      accessibilityRole="button"
      accessibilityLabel={descricao}
      accessibilityHint="Abre os detalhes da instituição"
      style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado]}
    >
      <View style={estilos.topo}>
        <Text style={estilos.nome}>{nome}</Text>
        {distancia && <Text style={estilos.distancia}>{distancia}</Text>}
      </View>

      {demonstracao && <EtiquetaDemonstracao />}

      <View style={estilos.linha}>
        <Ionicons name="location-outline" size={18} color={cores.textoSecundario} />
        <Text style={estilos.texto} numberOfLines={2}>
          {endereco}
        </Text>
      </View>
      <View style={estilos.linha}>
        <Ionicons name="time-outline" size={18} color={cores.textoSecundario} />
        <Text style={estilos.texto} numberOfLines={2}>
          {horario}
        </Text>
      </View>

      <TiposEmFalta tiposEmFalta={tiposEmFalta} estoqueAtualizadoEm={estoqueAtualizadoEm} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 16, gap: 8 },
  pressionado: { opacity: 0.85 },
  topo: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  nome: { flex: 1, fontFamily: fontes.titulo, fontSize: tamanhos.texto + 1, color: cores.texto },
  distancia: { fontFamily: fontes.botao, fontSize: tamanhos.textoSecundario, color: cores.primaria, marginTop: 2 },
  linha: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  texto: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
});

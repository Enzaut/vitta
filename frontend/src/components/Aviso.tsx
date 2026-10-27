import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { cores, fontes, raio, tamanhos } from "../theme";

type Props = {
  tipo: "erro" | "sucesso";
  texto: string;
  // Se informado, mostra um "X" para dispensar a mensagem.
  aoFechar?: () => void;
};

// Caixa de mensagem em destaque (vermelha para erro, verde para sucesso).
export function Aviso({ tipo, texto, aoFechar }: Props) {
  const cor = tipo === "erro" ? cores.erro : cores.sucesso;

  return (
    <View
      accessibilityRole="alert"
      style={[estilos.caixa, { borderColor: cor, backgroundColor: tipo === "erro" ? cores.fundoErro : cores.fundoSucesso }]}
    >
      <Ionicons name={tipo === "erro" ? "alert-circle" : "checkmark-circle"} size={22} color={cor} />
      <Text style={[estilos.texto, { color: tipo === "erro" ? cores.primariaEscura : "#1F6B41" }]}>{texto}</Text>
      {aoFechar && (
        <Pressable onPress={aoFechar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar mensagem">
          <Ionicons name="close" size={20} color={cor} />
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: raio,
    borderWidth: 1,
    marginBottom: 16,
  },
  texto: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, lineHeight: 20 },
});

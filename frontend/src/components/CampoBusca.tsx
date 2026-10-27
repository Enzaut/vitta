import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { cores, fontes, raio, tamanhos } from "../theme";

type Props = {
  valor: string;
  aoMudar: (texto: string) => void;
  placeholder: string;
};

// Campo de pesquisa: lupa, texto e um "X" para limpar. O limite de 80 letras é o mesmo da API.
export function CampoBusca({ valor, aoMudar, placeholder }: Props) {
  return (
    <View style={estilos.caixa}>
      <Ionicons name="search-outline" size={20} color={cores.textoSecundario} />
      <TextInput
        style={estilos.entrada}
        value={valor}
        onChangeText={aoMudar}
        placeholder={placeholder}
        placeholderTextColor="#7A7A7A"
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={80}
      />
      {valor.length > 0 && (
        <Pressable onPress={() => aoMudar("")} hitSlop={12} accessibilityRole="button" accessibilityLabel="Limpar a busca">
          <Ionicons name="close-circle" size={20} color={cores.textoSecundario} />
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: raio,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  entrada: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.texto, paddingVertical: 10 },
});

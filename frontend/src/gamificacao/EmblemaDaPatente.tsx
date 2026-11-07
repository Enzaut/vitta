import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { fontes } from "../theme";
import { aparenciaDaPatente } from "./aparencia";

type Props = { nivel: number; nome: string };

// A patente do doador (RN-008) numa etiqueta com medalha e cor próprias.
export function EmblemaDaPatente({ nivel, nome }: Props) {
  const { cor, fundo } = aparenciaDaPatente(nivel);

  return (
    <View style={[estilos.etiqueta, { backgroundColor: fundo, borderColor: cor }]} accessible accessibilityLabel={`Patente ${nome}`}>
      <Ionicons name="medal" size={16} color={cor} />
      <Text style={[estilos.texto, { color: cor }]}>{nome}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1 },
  texto: { fontFamily: fontes.botao, fontSize: 14 },
});

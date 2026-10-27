import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { cores, fontes, raio, tamanhos } from "../theme";

type Props = {
  titulo: string;
  aoPressionar: () => void;
  variante?: "primario" | "secundario" | "perigo";
  carregando?: boolean;
  desabilitado?: boolean;
};

// Botões do Guia de Estilo: primário (vermelho, texto branco) e secundário (borda vermelha).
export function Botao({ titulo, aoPressionar, variante = "primario", carregando = false, desabilitado = false }: Props) {
  const inativo = desabilitado || carregando;
  const cheio = variante !== "secundario";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={aoPressionar}
      style={({ pressed }) => [
        estilos.base,
        cheio ? estilos.cheio : estilos.vazado,
        variante === "perigo" && estilos.perigo,
        pressed && (cheio ? estilos.cheioPressionado : estilos.vazadoPressionado),
        inativo && estilos.inativo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={cheio ? "#FFFFFF" : cores.primaria} />
      ) : (
        <Text style={[estilos.texto, { color: cheio ? "#FFFFFF" : cores.primaria }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: raio,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cheio: {
    backgroundColor: cores.primaria,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cheioPressionado: { backgroundColor: cores.primariaEscura },
  perigo: { backgroundColor: cores.primariaEscura },
  vazado: { backgroundColor: cores.fundo, borderWidth: 1.5, borderColor: cores.primaria },
  vazadoPressionado: { backgroundColor: cores.fundoErro },
  inativo: { opacity: 0.6 },
  texto: { fontFamily: fontes.botao, fontSize: tamanhos.botao, textAlign: "center" },
});

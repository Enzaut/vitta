import { useEffect, useRef, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cores } from "../theme";

type Props = {
  children: ReactNode;
  // Telas sem cabeçalho precisam respeitar também a área do topo (barra de status).
  comTopo?: boolean;
  centralizar?: boolean;
  // Quando este valor muda, a tela volta para o topo (ex.: ao passar para o próximo passo de um formulário).
  chaveRolagem?: string | number;
};

// Base de toda tela: respeita as bordas do aparelho, rola e sobe junto com o teclado.
export function Tela({ children, comTopo = false, centralizar = false, chaveRolagem }: Props) {
  const rolagem = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    rolagem.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [chaveRolagem]);

  return (
    <SafeAreaView style={estilos.area} edges={comTopo ? ["top", "bottom", "left", "right"] : ["bottom", "left", "right"]}>
      <KeyboardAvoidingView style={estilos.area} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={rolagem}
          contentContainerStyle={[estilos.conteudo, centralizar && estilos.centralizado]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  area: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flexGrow: 1, padding: 24 },
  centralizado: { justifyContent: "center" },
});

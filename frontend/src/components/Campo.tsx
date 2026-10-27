import { Ionicons } from "@expo/vector-icons";
import { useState, type ComponentRef, type Ref } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { cores, fontes, raio, tamanhos } from "../theme";

// Tipo do "controle remoto" de um campo (usado para mandar o foco para o campo seguinte).
export type EntradaRef = ComponentRef<typeof TextInput>;

type Props = TextInputProps & {
  rotulo: string;
  // Mensagem de erro mostrada abaixo do campo (a borda fica vermelha).
  erro?: string;
  icone?: keyof typeof Ionicons.glyphMap;
  // Campo de senha: esconde o texto e mostra o botão de "olho".
  ehSenha?: boolean;
  ref?: Ref<EntradaRef>;
};

// Campo de formulário do Guia de Estilo: borda arredondada, ícone, destaque no foco e erro claro.
export function Campo({ rotulo, erro, icone, ehSenha = false, ref, onFocus, onBlur, ...resto }: Props) {
  const [focado, setFocado] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>

      <View style={[estilos.caixa, focado && estilos.focado, !!erro && estilos.comErro]}>
        {icone && <Ionicons name={icone} size={20} color={erro ? cores.erro : cores.textoSecundario} />}

        <TextInput
          ref={ref}
          style={estilos.entrada}
          placeholderTextColor="#7A7A7A"
          accessibilityLabel={rotulo}
          secureTextEntry={ehSenha && !mostrarSenha}
          autoCapitalize="none"
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          {...resto}
        />

        {ehSenha && (
          <Pressable
            onPress={() => setMostrarSenha((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            <Ionicons name={mostrarSenha ? "eye-off-outline" : "eye-outline"} size={22} color={cores.textoSecundario} />
          </Pressable>
        )}
      </View>

      {!!erro && (
        <Text style={estilos.erro} accessibilityRole="alert">
          {erro}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { marginBottom: 16 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.texto, marginBottom: 6 },
  caixa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: raio,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  focado: { borderColor: cores.primariaEscura },
  comErro: { borderColor: cores.erro, backgroundColor: cores.fundoErro },
  entrada: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.texto, paddingVertical: 12 },
  erro: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.erro, marginTop: 6 },
});

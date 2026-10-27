import { Pressable, StyleSheet, Text, View } from "react-native";
import { cores, fontes, raio, tamanhos } from "../theme";
import { TIPOS_SANGUINEOS } from "../validation/campos";

type Props = {
  valor: string | null;
  aoMudar: (tipo: string | null) => void;
  erro?: string;
};

// Escolha do tipo sanguíneo entre os 8 tipos. Tocar no tipo já selecionado limpa a escolha.
export function SeletorTipoSanguineo({ valor, aoMudar, erro }: Props) {
  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>Tipo sanguíneo</Text>

      <View style={estilos.opcoes} accessibilityRole="radiogroup">
        {TIPOS_SANGUINEOS.map((tipo) => {
          const selecionado = tipo === valor;
          return (
            <Pressable
              key={tipo}
              onPress={() => aoMudar(selecionado ? null : tipo)}
              accessibilityRole="radio"
              accessibilityLabel={`Tipo sanguíneo ${tipo}`}
              aria-checked={selecionado}
              style={({ pressed }) => [estilos.opcao, selecionado && estilos.selecionada, pressed && !selecionado && estilos.pressionada]}
            >
              <Text style={[estilos.texto, selecionado && estilos.textoSelecionado]}>{tipo}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={estilos.dica}>Toque de novo no tipo escolhido para limpar.</Text>
      {!!erro && (
        <Text style={estilos.erro} accessibilityRole="alert">
          {erro}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { marginBottom: 24 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.texto, marginBottom: 8 },
  opcoes: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  opcao: {
    flexGrow: 1,
    flexBasis: "22%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  selecionada: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  pressionada: { backgroundColor: cores.fundoErro },
  texto: { fontFamily: fontes.botao, fontSize: tamanhos.texto, color: cores.texto },
  textoSelecionado: { color: "#FFFFFF" },
  dica: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, marginTop: 8 },
  erro: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.erro, marginTop: 6 },
});

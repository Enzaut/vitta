import { Pressable, StyleSheet, Text, View } from "react-native";
import { cores, fontes, raio, tamanhos } from "../theme";
import { TIPOS_SANGUINEOS } from "../validation/campos";

type Props = {
  rotulo: string;
  // Tipos escolhidos ("A+", "O-"...). Pode escolher vários.
  valor: string[];
  aoMudar: (tipos: string[]) => void;
  dica?: string;
  erro?: string;
};

// Escolha de vários tipos sanguíneos (a instituição marca os que estão em falta ou os que a campanha procura).
export function SeletorDeTipos({ rotulo, valor, aoMudar, dica, erro }: Props) {
  const alternar = (tipo: string) => aoMudar(valor.includes(tipo) ? valor.filter((t) => t !== tipo) : [...valor, tipo]);

  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>

      <View style={estilos.opcoes}>
        {TIPOS_SANGUINEOS.map((tipo) => {
          const marcado = valor.includes(tipo);
          return (
            <Pressable
              key={tipo}
              onPress={() => alternar(tipo)}
              accessibilityRole="checkbox"
              accessibilityLabel={`Tipo sanguíneo ${tipo}`}
              accessibilityState={{ checked: marcado }}
              style={({ pressed }) => [estilos.opcao, marcado && estilos.marcada, pressed && !marcado && estilos.pressionada]}
            >
              <Text style={[estilos.texto, marcado && estilos.textoMarcado]}>{tipo}</Text>
            </Pressable>
          );
        })}
      </View>

      {!!dica && <Text style={estilos.dica}>{dica}</Text>}
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
  marcada: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  pressionada: { backgroundColor: cores.fundoErro },
  texto: { fontFamily: fontes.botao, fontSize: tamanhos.texto, color: cores.texto },
  textoMarcado: { color: "#FFFFFF" },
  dica: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, marginTop: 8 },
  erro: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.erro, marginTop: 6 },
});

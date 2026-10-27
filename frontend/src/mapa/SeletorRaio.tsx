import { Pressable, StyleSheet, Text, View } from "react-native";
import { cores, fontes } from "../theme";
import { RAIOS_KM } from "./geografia";

type Props = {
  valor: number;
  aoMudar: (km: number) => void;
};

// Controle do raio de busca (HU-05, cenário 4): 5, 10, 20 ou 50 km.
export function SeletorRaio({ valor, aoMudar }: Props) {
  return (
    <View style={estilos.grupo} accessibilityRole="radiogroup" accessibilityLabel="Raio de busca">
      {RAIOS_KM.map((km) => {
        const escolhido = km === valor;
        return (
          <Pressable
            key={km}
            onPress={() => aoMudar(km)}
            accessibilityRole="radio"
            accessibilityState={{ checked: escolhido }}
            accessibilityLabel={`${km} quilômetros`}
            style={[estilos.opcao, escolhido && estilos.escolhida]}
          >
            <Text style={[estilos.texto, escolhido && estilos.textoEscolhido]}>{km} km</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: 4,
    padding: 4,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  opcao: { minWidth: 52, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  escolhida: { backgroundColor: cores.primaria },
  texto: { fontFamily: fontes.textoMedio, fontSize: 14, color: cores.texto },
  textoEscolhido: { color: "#FFFFFF" },
});

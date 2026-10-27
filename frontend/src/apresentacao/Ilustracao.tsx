import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { ILUSTRACOES, type NomeDaIlustracao } from "./ilustracoes";

// Desenha uma das ilustrações do carrossel. São só enfeite (o texto já diz tudo), então o leitor de tela pula.
export function Ilustracao({ nome }: { nome: NomeDaIlustracao }) {
  return (
    <View style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={ILUSTRACOES[nome]} width="100%" height="100%" />
    </View>
  );
}

import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { AbasInstituicaoParamList } from "../navigation/types";
import { cores, fontes } from "../theme";
import { CampanhasScreen } from "./CampanhasScreen";
import { ContaScreen } from "./ContaScreen";
import { PainelScreen } from "./PainelScreen";

const Abas = createBottomTabNavigator<AbasInstituicaoParamList>();

type Icone = keyof typeof Ionicons.glyphMap;

// Menu de baixo da instituição: painel (pedido no mapa e estoque), campanhas e conta.
export function AbasInstituicaoNavigator() {
  return (
    <Abas.Navigator
      screenOptions={{
        headerTitleStyle: { fontFamily: fontes.titulo, color: cores.texto },
        headerShadowVisible: false,
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSecundario,
        tabBarLabelStyle: { fontFamily: fontes.textoMedio, fontSize: 12 },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Abas.Screen name="Painel" component={PainelScreen} options={opcoes("VITTA Instituição", "Painel", "grid-outline")} />
      <Abas.Screen name="CampanhasDaInstituicao" component={CampanhasScreen} options={opcoes("Campanhas", "Campanhas", "megaphone-outline")} />
      <Abas.Screen name="ContaDaInstituicao" component={ContaScreen} options={opcoes("Minha conta", "Conta", "person-outline")} />
    </Abas.Navigator>
  );
}

const opcoes = (titulo: string, rotulo: string, icone: Icone) => ({
  title: titulo,
  tabBarLabel: rotulo,
  tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name={icone} size={size} color={color} />,
});

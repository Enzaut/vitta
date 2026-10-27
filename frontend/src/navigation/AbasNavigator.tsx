import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { InicioScreen } from "../screens/InicioScreen";
import { MapaScreen } from "../screens/MapaScreen";
import { PerfilScreen } from "../screens/PerfilScreen";
import { cores, fontes } from "../theme";
import type { AbasParamList } from "./types";

const Abas = createBottomTabNavigator<AbasParamList>();

type Icone = keyof typeof Ionicons.glyphMap;

// Menu de baixo do doador. O agendamento ganha a própria aba quando a HU-04 entrar.
export function AbasNavigator() {
  return (
    <Abas.Navigator
      screenOptions={{
        headerTitleStyle: { fontFamily: fontes.titulo, color: cores.texto },
        headerShadowVisible: false,
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSecundario,
        tabBarLabelStyle: { fontFamily: fontes.textoMedio, fontSize: 12 },
        // Com o teclado aberto (busca por nome), o menu de baixo sai da frente.
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Abas.Screen name="Inicio" component={InicioScreen} options={opcoes("VITTA", "Início", "home-outline")} />
      <Abas.Screen name="Mapa" component={MapaScreen} options={opcoes("Hemocentros", "Mapa", "map-outline")} />
      <Abas.Screen name="Perfil" component={PerfilScreen} options={opcoes("Meu Perfil", "Perfil", "person-outline")} />
    </Abas.Navigator>
  );
}

const opcoes = (titulo: string, rotulo: string, icone: Icone) => ({
  title: titulo,
  tabBarLabel: rotulo,
  tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name={icone} size={size} color={color} />,
});

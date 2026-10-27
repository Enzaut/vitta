import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { ApresentacaoCarrossel } from "../apresentacao/ApresentacaoCarrossel";
import { useAuth } from "../auth/AuthContext";
import { useApresentacaoInicial } from "../hooks/useApresentacaoInicial";
import { ApresentacaoScreen } from "../screens/ApresentacaoScreen";
import { BoasVindasScreen } from "../screens/BoasVindasScreen";
import { CadastroScreen } from "../screens/CadastroScreen";
import { DadosScreen } from "../screens/DadosScreen";
import { FormularioIntroScreen } from "../screens/FormularioIntroScreen";
import { FormularioScreen } from "../screens/FormularioScreen";
import { InstituicaoScreen } from "../screens/InstituicaoScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { PrivacidadeScreen } from "../screens/PrivacidadeScreen";
import { ResultadoFormularioScreen } from "../screens/ResultadoFormularioScreen";
import { cores, fontes } from "../theme";
import { AbasNavigator } from "./AbasNavigator";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

// RN-011: quem não está autenticado só enxerga as telas públicas (boas-vindas, cadastro e login).
// Ao entrar (ou sair), o conjunto de telas troca sozinho.
export function AppNavigator() {
  const { carregando, doador } = useAuth();
  const apresentacao = useApresentacaoInicial();

  if (carregando || apresentacao.situacao === "carregando") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: cores.fundo }}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  // Primeira vez que o app abre neste aparelho: o carrossel de boas-vindas vem antes de tudo (e não volta sozinho).
  if (apresentacao.situacao === "pendente") {
    return <ApresentacaoCarrossel aoConcluir={apresentacao.concluir} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: cores.primaria,
          headerTitleStyle: { fontFamily: fontes.titulo, color: cores.texto },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        {doador ? (
          <>
            <Stack.Screen name="Abas" component={AbasNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="Instituicao" component={InstituicaoScreen} options={{ title: "Instituição" }} />
            <Stack.Screen name="Apresentacao" component={ApresentacaoScreen} options={{ headerShown: false, animation: "slide_from_bottom" }} />
            <Stack.Screen name="Dados" component={DadosScreen} options={{ title: "Meus dados" }} />
            <Stack.Screen name="Privacidade" component={PrivacidadeScreen} options={{ title: "Privacidade e Dados" }} />
            <Stack.Screen name="FormularioIntro" component={FormularioIntroScreen} options={{ title: "Elegibilidade" }} />
            <Stack.Screen name="Formulario" component={FormularioScreen} options={{ title: "Formulário de elegibilidade" }} />
            <Stack.Screen name="ResultadoFormulario" component={ResultadoFormularioScreen} options={{ title: "Resultado", headerBackVisible: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="BoasVindas" component={BoasVindasScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Cadastro" component={CadastroScreen} options={{ title: "Criar Conta" }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Entrar" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

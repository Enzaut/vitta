import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { ApresentacaoCarrossel } from "../apresentacao/ApresentacaoCarrossel";
import { useAuth } from "../auth/AuthContext";
import { useApresentacaoInicial } from "../hooks/useApresentacaoInicial";
import { AbasInstituicaoNavigator } from "../instituicao/AbasInstituicaoNavigator";
import { CadastroInstituicaoScreen } from "../instituicao/CadastroInstituicaoScreen";
import { CampanhaFormScreen } from "../instituicao/CampanhaFormScreen";
import { DadosInstituicaoScreen } from "../instituicao/DadosInstituicaoScreen";
import { EstoqueScreen } from "../instituicao/EstoqueScreen";
import { useInstituicao } from "../instituicao/InstituicaoContext";
import { LoginInstituicaoScreen } from "../instituicao/LoginInstituicaoScreen";
import { SolicitacaoInclusaoScreen } from "../instituicao/SolicitacaoInclusaoScreen";
import { ApresentacaoScreen } from "../screens/ApresentacaoScreen";
import { BoasVindasScreen } from "../screens/BoasVindasScreen";
import { CadastroScreen } from "../screens/CadastroScreen";
import { CampanhasDoadorScreen } from "../screens/CampanhasDoadorScreen";
import { DadosScreen } from "../screens/DadosScreen";
import { DetalhesDaDoacaoScreen } from "../screens/DetalhesDaDoacaoScreen";
import { FormularioIntroScreen } from "../screens/FormularioIntroScreen";
import { FormularioScreen } from "../screens/FormularioScreen";
import { HistoricoDeAgendamentosScreen } from "../screens/HistoricoDeAgendamentosScreen";
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
  const { carregando: carregandoInstituicao, conta } = useInstituicao();
  const apresentacao = useApresentacaoInicial();

  if (carregando || carregandoInstituicao || apresentacao.situacao === "carregando") {
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
            <Stack.Screen name="HistoricoDeAgendamentos" component={HistoricoDeAgendamentosScreen} options={{ title: "Histórico de agendamentos" }} />
            <Stack.Screen name="DetalhesDaDoacao" component={DetalhesDaDoacaoScreen} options={{ title: "Detalhes da doação" }} />
            <Stack.Screen name="Campanhas" component={CampanhasDoadorScreen} options={{ title: "Campanhas" }} />
            <Stack.Screen name="Apresentacao" component={ApresentacaoScreen} options={{ headerShown: false, animation: "slide_from_bottom" }} />
            <Stack.Screen name="Dados" component={DadosScreen} options={{ title: "Meus dados" }} />
            <Stack.Screen name="Privacidade" component={PrivacidadeScreen} options={{ title: "Privacidade e Dados" }} />
            <Stack.Screen name="FormularioIntro" component={FormularioIntroScreen} options={{ title: "Elegibilidade" }} />
            <Stack.Screen name="Formulario" component={FormularioScreen} options={{ title: "Formulário de elegibilidade" }} />
            <Stack.Screen name="ResultadoFormulario" component={ResultadoFormularioScreen} options={{ title: "Resultado", headerBackVisible: false }} />
          </>
        ) : conta ? (
          <>
            <Stack.Screen name="AbasInstituicao" component={AbasInstituicaoNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="SolicitacaoInclusao" component={SolicitacaoInclusaoScreen} options={{ title: "Inclusão no mapa" }} />
            <Stack.Screen name="CampanhaForm" component={CampanhaFormScreen} options={{ title: "Campanha" }} />
            <Stack.Screen name="Estoque" component={EstoqueScreen} options={{ title: "Estoque" }} />
            <Stack.Screen name="DadosInstituicao" component={DadosInstituicaoScreen} options={{ title: "Telefone e horário" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="BoasVindas" component={BoasVindasScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Cadastro" component={CadastroScreen} options={{ title: "Criar Conta" }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Entrar" }} />
            <Stack.Screen name="CadastroInstituicao" component={CadastroInstituicaoScreen} options={{ title: "Cadastrar instituição" }} />
            <Stack.Screen name="LoginInstituicao" component={LoginInstituicaoScreen} options={{ title: "Entrar como instituição" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

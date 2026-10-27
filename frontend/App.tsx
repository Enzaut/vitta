import { Poppins_500Medium, Poppins_600SemiBold, useFonts } from "@expo-google-fonts/poppins";
import { Roboto_400Regular, Roboto_500Medium } from "@expo-google-fonts/roboto";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { cores } from "./src/theme";

export default function App() {
  // Fontes do Guia de Estilo: Poppins (títulos e botões) e Roboto (texto).
  const [fontesCarregadas, erroDeFonte] = useFonts({
    Poppins_500Medium,
    Poppins_600SemiBold,
    Roboto_400Regular,
    Roboto_500Medium,
  });

  // Se as fontes falharem, o app abre mesmo assim, com a fonte do sistema.
  if (!fontesCarregadas && !erroDeFonte) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: cores.fundo }}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

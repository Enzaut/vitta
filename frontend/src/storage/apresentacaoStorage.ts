import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Guarda no aparelho se a pessoa já passou pela apresentação de boas-vindas, que só aparece na primeira vez que o app abre.
// No navegador (só para testes em desenvolvimento) usamos o localStorage, como no token.
const CHAVE = "vitta.apresentacao.vista";

export async function apresentacaoJaVista(): Promise<boolean> {
  try {
    const valor = Platform.OS === "web" ? globalThis.localStorage?.getItem(CHAVE) : await SecureStore.getItemAsync(CHAVE);
    return valor === "1";
  } catch {
    // Se o armazenamento falhar, é melhor não repetir a apresentação a cada abertura.
    return true;
  }
}

export async function marcarApresentacaoComoVista(): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(CHAVE, "1");
    else await SecureStore.setItemAsync(CHAVE, "1");
  } catch {
    // sem armazenamento, a apresentação só vai aparecer de novo na próxima abertura
  }
}

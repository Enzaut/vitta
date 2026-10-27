import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// O token JWT fica no armazenamento seguro do celular (Keychain no iPhone, Keystore no Android).
// No navegador (só para testes em desenvolvimento) usamos o localStorage.
const CHAVE = "vitta.token";

export async function lerToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(CHAVE) ?? null;
    return await SecureStore.getItemAsync(CHAVE);
  } catch {
    return null;
  }
}

export async function salvarToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(CHAVE, token);
    return;
  }
  await SecureStore.setItemAsync(CHAVE, token);
}

export async function apagarToken(): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.removeItem(CHAVE);
    else await SecureStore.deleteItemAsync(CHAVE);
  } catch {
    // Se não der para apagar, o token vencido ou inválido será recusado pela API de qualquer forma.
  }
}

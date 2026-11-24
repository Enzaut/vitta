import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// O token JWT fica no armazenamento seguro do celular (Keychain no iPhone, Keystore no Android).
// No navegador (só para testes em desenvolvimento) usamos o localStorage.
const CHAVE = "vitta.token";
// A conta da instituição guarda o token em outra chave: doador e instituição nunca se misturam.
export const CHAVE_INSTITUICAO = "vitta.token.instituicao";

export async function lerToken(chave: string = CHAVE): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(chave) ?? null;
    return await SecureStore.getItemAsync(chave);
  } catch {
    return null;
  }
}

export async function salvarToken(token: string, chave: string = CHAVE): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(chave, token);
    return;
  }
  await SecureStore.setItemAsync(chave, token);
}

export async function apagarToken(chave: string = CHAVE): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.removeItem(chave);
    else await SecureStore.deleteItemAsync(chave);
  } catch {
    // Se não der para apagar, o token vencido ou inválido será recusado pela API de qualquer forma.
  }
}

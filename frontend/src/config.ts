// Endereço da API. Vem do arquivo frontend/.env (EXPO_PUBLIC_API_URL) e nunca é escrito no código.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
export const API_CONFIGURADA = API_URL.length > 0;

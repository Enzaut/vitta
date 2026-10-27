// Situações possíveis da localização do aparelho (HU-05 e RNF-008).

export type Posicao = {
  latitude: number;
  longitude: number;
  // Raio de incerteza do GPS, em metros (nulo se o aparelho não informa).
  precisaoM: number | null;
  // A pessoa liberou só a localização aproximada (Android 12 ou mais, ou iPhone com "Localização exata" desligada).
  aproximada: boolean;
};

export type EstadoLocalizacao =
  // Conferindo a permissão, o GPS e lendo a posição
  | { tipo: "verificando" }
  // Tudo certo: temos a posição
  | { tipo: "pronta"; posicao: Posicao }
  // Permissão negada. podePedirDeNovo = o sistema ainda deixa o app perguntar (senão, só pelas configurações)
  | { tipo: "negada"; podePedirDeNovo: boolean }
  // Permissão concedida, mas o GPS (serviço de localização) do aparelho está desligado
  | { tipo: "gpsDesligado" }
  // Permissão e GPS ok, mas o aparelho não devolveu a posição a tempo (sem sinal, dentro de prédio...)
  | { tipo: "indisponivel" };

// Mensagem do cenário 5 da HU-05, igual à do Documento de Requisitos.
export const MSG_PERMISSAO_NEGADA =
  "Para visualizar as instituições próximas, precisamos da sua localização. Ative a permissão nas configurações do dispositivo.";
export const MSG_GPS_DESLIGADO = "O GPS do aparelho está desligado. Ative a localização para ver as instituições próximas.";
export const MSG_SEM_SINAL = "Não conseguimos obter a sua localização agora. Confira o sinal do GPS e tente de novo.";

import type { Posicao } from "../localizacao/estado";

// Quantos km tem 1 grau de latitude.
const KM_POR_GRAU = 111.195;

// Raios que a pessoa pode escolher (HU-05, cenário 4). O padrão é o da RN07.
export const RAIOS_KM = [5, 10, 20, 50] as const;
export const RAIO_PADRAO_KM = 20;

export type Ponto = { latitude: number; longitude: number };

// Pedaço do mapa a mostrar: o centro e quantos graus cabem na vista.
export type Alvo = Ponto & { delta: number };

// A API recebe a posição com 3 casas decimais (cerca de 100 m, o mesmo que o GPS "equilibrado" entrega),
// então a localização exata da pessoa nunca sai do aparelho.
export const arredondarCoordenada = (graus: number) => Math.round(graus * 1000) / 1000;

// Vista que mostra o círculo do raio inteiro, com uma folga.
export function alvoDoRaio(centro: Ponto, raioKm: number): Alvo {
  return { latitude: centro.latitude, longitude: centro.longitude, delta: (raioKm * 2.6) / KM_POR_GRAU };
}

// Vista de perto (cerca de 2 km), usada quando a pessoa escolhe uma instituição na busca.
export const alvoDaInstituicao = (instituicao: Ponto): Alvo => ({
  latitude: instituicao.latitude,
  longitude: instituicao.longitude,
  delta: 0.02,
});

// 0.4 -> "400 m", 3.2 -> "3,2 km", 12 -> "12 km"
export function formatarDistancia(km: number): string {
  if (km < 0.1) return "menos de 100 m";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${String(Math.round(km * 10) / 10).replace(".", ",")} km`;
}

// Diz quão confiável é a posição, para a pessoa saber o que esperar das distâncias (RNF-008, precisão).
export function descreverPrecisao(posicao: Posicao): { texto: string; fraca: boolean } {
  if (posicao.aproximada) {
    return { texto: "Localização aproximada: as distâncias podem variar alguns quilômetros.", fraca: true };
  }
  if (posicao.precisaoM === null) return { texto: "Localização obtida pelo aparelho.", fraca: false };

  const metros = Math.round(posicao.precisaoM);
  if (metros > 1000) {
    return { texto: `Sinal fraco (precisão de cerca de ${formatarDistancia(metros / 1000)}). As distâncias podem variar.`, fraca: true };
  }
  return { texto: `Precisão do GPS: cerca de ${metros} m.`, fraca: false };
}

// "O-" -> "O negativo" (para o leitor de tela não ler "O hífen")
export function falarTipo(tipo: string): string {
  return tipo.replace("+", " positivo").replace("-", " negativo");
}

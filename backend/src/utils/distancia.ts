// Distância entre dois pontos do mapa (HU-05: instituições mais próximas, RN07 raio de alcance).
export type Coordenada = { latitude: number; longitude: number };

// Raio médio da Terra em km (valor usado pela fórmula de Haversine).
const RAIO_DA_TERRA_KM = 6371.0088;

const paraRadianos = (graus: number) => (graus * Math.PI) / 180;

// Distância em linha reta pela superfície da Terra (fórmula de Haversine), em km.
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const dLat = paraRadianos(b.latitude - a.latitude);
  const dLng = paraRadianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(paraRadianos(a.latitude)) * Math.cos(paraRadianos(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_DA_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Quantos km vale 1 grau de latitude (serve para os testes e para montar a área do mapa).
export const KM_POR_GRAU_DE_LATITUDE = (Math.PI / 180) * RAIO_DA_TERRA_KM;

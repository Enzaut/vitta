import * as Location from "expo-location";

export type Ponto = { latitude: number; longitude: number };

// Lê a posição uma única vez (usado para preencher a latitude e a longitude do pedido de inclusão no mapa e para
// mostrar a distância das campanhas). Se a permissão foi negada ou o GPS está desligado, lança um erro com a mensagem.
export async function lerPosicaoAtual(): Promise<Ponto> {
  const permissao = await Location.requestForegroundPermissionsAsync();
  if (!permissao.granted) {
    throw new Error("Para usar a sua localização, ative a permissão nas configurações do aparelho.");
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error("O GPS do aparelho está desligado. Ative a localização e tente de novo.");
  }
  const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: coords.latitude, longitude: coords.longitude };
}

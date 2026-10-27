import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Circle, Marker, type Region } from "react-native-maps";
import { cores } from "../theme";
import type { Alvo } from "./geografia";
import type { PropsDoMapa } from "./tiposDoMapa";

const paraRegiao = ({ latitude, longitude, delta }: Alvo): Region => ({
  latitude,
  longitude,
  latitudeDelta: delta,
  longitudeDelta: delta,
});

// HU-05, cenário 1: mapa centrado na pessoa, com o círculo do raio e um marcador por instituição.
// Tocar no marcador abre os detalhes (cenário 2).
export function MapaInstituicoes({ posicao, raioKm, vistaInicial, alvo, instituicoes, aoAbrir }: PropsDoMapa) {
  const mapa = useRef<MapView>(null);

  useEffect(() => {
    if (alvo) mapa.current?.animateToRegion(paraRegiao(alvo), 600);
  }, [alvo]);

  return (
    <MapView
      ref={mapa}
      style={estilos.mapa}
      initialRegion={paraRegiao(vistaInicial)}
      showsUserLocation
      showsMyLocationButton={false}
      zoomControlEnabled={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      moveOnMarkerPress={false}
      accessibilityLabel="Mapa com a sua localização e as instituições de coleta de sangue"
    >
      <Circle
        center={{ latitude: posicao.latitude, longitude: posicao.longitude }}
        radius={raioKm * 1000}
        strokeColor="rgba(214, 40, 40, 0.8)"
        strokeWidth={1.5}
        fillColor="rgba(214, 40, 40, 0.08)"
      />
      {instituicoes.map((instituicao) => (
        <Marker
          key={instituicao.id}
          coordinate={{ latitude: instituicao.latitude, longitude: instituicao.longitude }}
          pinColor={cores.primaria}
          tracksViewChanges={false}
          onPress={() => aoAbrir(instituicao)}
        />
      ))}
    </MapView>
  );
}

const estilos = StyleSheet.create({
  mapa: { flex: 1 },
});

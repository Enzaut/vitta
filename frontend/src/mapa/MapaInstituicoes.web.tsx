import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { PropsDoMapa } from "./tiposDoMapa";

// No navegador a biblioteca react-native-maps não funciona, então o mapa é desenhado com Leaflet (mapa aberto do
// OpenStreetMap) dentro de um iframe. O iframe é isolado (sandbox): o app e o mapa só trocam mensagens.
//  - app -> mapa: "dados" (posição, raio e instituições) e "mover" (nova vista);
//  - mapa -> app: "pronto" (o mapa carregou) e "abrir" (a pessoa tocou num marcador).
// O nome da instituição entra no mapa como texto puro, nunca como HTML.
const PAGINA = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{height:100%;margin:0}.leaflet-container{font-family:Roboto,Arial,sans-serif}</style>
</head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var mapa = L.map('m', { zoomControl: false }).setView([-15.78, -47.93], 11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapa);
var camada = L.layerGroup().addTo(mapa);
var iniciado = false;
function ir(a) {
  var d = a.delta / 2;
  mapa.fitBounds([[a.latitude - d, a.longitude - d], [a.latitude + d, a.longitude + d]], { animate: true });
}
function texto(t) { var s = document.createElement('span'); s.textContent = t; return s; }
window.addEventListener('message', function (e) {
  var m = e.data;
  if (!m || !m.tipo) return;
  if (m.tipo === 'dados') {
    camada.clearLayers();
    L.circle([m.posicao.latitude, m.posicao.longitude], { radius: m.raioKm * 1000, color: '#D62828', weight: 1.5, fillColor: '#D62828', fillOpacity: 0.08 }).addTo(camada);
    m.instituicoes.forEach(function (i) {
      var c = L.circleMarker([i.latitude, i.longitude], { radius: 10, color: '#FFFFFF', weight: 2, fillColor: '#D62828', fillOpacity: 1 }).addTo(camada);
      c.bindTooltip(texto(i.nome));
      c.on('click', function () { parent.postMessage({ tipo: 'abrir', id: i.id }, '*'); });
    });
    L.circleMarker([m.posicao.latitude, m.posicao.longitude], { radius: 8, color: '#FFFFFF', weight: 3, fillColor: '#1A73E8', fillOpacity: 1 }).addTo(camada).bindTooltip(texto('Você está aqui'));
    if (!iniciado) { iniciado = true; ir(m.vista); }
  }
  if (m.tipo === 'mover') ir(m.alvo);
});
parent.postMessage({ tipo: 'pronto' }, '*');
</script></body></html>`;

export function MapaInstituicoes({ posicao, raioKm, vistaInicial, alvo, instituicoes, aoAbrir }: PropsDoMapa) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const [pronto, setPronto] = useState(false);
  // O que a mensagem de "abrir" precisa para achar a instituição e chamar a função mais recente.
  const lista = useRef(instituicoes);
  const abrir = useRef(aoAbrir);
  lista.current = instituicoes;
  abrir.current = aoAbrir;

  useEffect(() => {
    const ouvir = (e: MessageEvent) => {
      if (e.source !== quadro.current?.contentWindow) return;
      const msg = e.data as { tipo?: string; id?: string } | null;
      if (msg?.tipo === "pronto") setPronto(true);
      if (msg?.tipo === "abrir") {
        const achada = lista.current.find((i) => i.id === msg.id);
        if (achada) abrir.current(achada);
      }
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, []);

  // Sempre que a posição, o raio ou a lista mudam, o mapa é redesenhado. A "chave" evita redesenhar quando só mudou
  // a identidade dos objetos (a tela recria a vista e a lista a cada renderização).
  const vista = useRef(vistaInicial);
  vista.current = vistaInicial;
  const chave = JSON.stringify([posicao.latitude, posicao.longitude, raioKm, instituicoes.map((i) => [i.id, i.nome, i.latitude, i.longitude])]);
  useEffect(() => {
    if (!pronto) return;
    quadro.current?.contentWindow?.postMessage(
      {
        tipo: "dados",
        posicao: { latitude: posicao.latitude, longitude: posicao.longitude },
        raioKm,
        vista: vista.current,
        instituicoes: instituicoes.map((i) => ({ id: i.id, nome: i.nome, latitude: i.latitude, longitude: i.longitude })),
      },
      "*",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, chave]);

  // Raio novo, "Perto de mim" ou instituição escolhida na busca: o mapa se move.
  useEffect(() => {
    if (pronto && alvo) quadro.current?.contentWindow?.postMessage({ tipo: "mover", alvo }, "*");
  }, [pronto, alvo]);

  return (
    <View style={estilos.caixa} accessibilityLabel="Mapa com a sua localização e as instituições de coleta de sangue">
      <iframe ref={quadro} title="Mapa das instituições" srcDoc={PAGINA} sandbox="allow-scripts" style={{ border: 0, width: "100%", height: "100%" }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { flex: 1, backgroundColor: "#E9EEF2" },
});

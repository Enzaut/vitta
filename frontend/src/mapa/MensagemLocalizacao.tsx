import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Botao } from "../components/Botao";
import { MSG_GPS_DESLIGADO, MSG_PERMISSAO_NEGADA, MSG_SEM_SINAL, type EstadoLocalizacao } from "../localizacao/estado";
import { fontes, raio } from "../theme";

type Props = {
  estado: Exclude<EstadoLocalizacao, { tipo: "verificando" | "pronta" }>;
  aoAbrirConfiguracoes: () => void;
  aoAtivarLocalizacao: () => void;
  aoTentarDeNovo: () => void;
};

// Orientação quando não há localização (HU-05, cenário 5, e RNF-008): explica o que fazer e deixa a busca por nome funcionando.
export function MensagemLocalizacao({ estado, aoAbrirConfiguracoes, aoAtivarLocalizacao, aoTentarDeNovo }: Props) {
  const conteudo = {
    negada: { titulo: "Precisamos da sua localização", texto: MSG_PERMISSAO_NEGADA },
    gpsDesligado: { titulo: "GPS desligado", texto: MSG_GPS_DESLIGADO },
    indisponivel: { titulo: "Sem sinal de localização", texto: MSG_SEM_SINAL },
  }[estado.tipo];

  return (
    <View style={estilos.caixa} accessibilityRole="alert">
      <View style={estilos.cabecalho}>
        <Ionicons name={estado.tipo === "gpsDesligado" ? "navigate-circle-outline" : "location-outline"} size={26} color="#9A7400" />
        <Text style={estilos.titulo}>{conteudo.titulo}</Text>
      </View>

      <Text style={estilos.texto}>{conteudo.texto}</Text>
      <Text style={estilos.dica}>Enquanto isso, você pode buscar uma instituição pelo nome no campo acima.</Text>

      <View style={estilos.botoes}>
        {estado.tipo === "negada" && (
          <>
            <Botao titulo="Abrir configurações" aoPressionar={aoAbrirConfiguracoes} />
            {estado.podePedirDeNovo && <Botao titulo="Permitir localização" variante="secundario" aoPressionar={aoTentarDeNovo} />}
          </>
        )}
        {estado.tipo === "gpsDesligado" && (
          <>
            <Botao titulo="Ativar localização" aoPressionar={aoAtivarLocalizacao} />
            <Botao titulo="Tentar de novo" variante="secundario" aoPressionar={aoTentarDeNovo} />
          </>
        )}
        {estado.tipo === "indisponivel" && <Botao titulo="Tentar de novo" aoPressionar={aoTentarDeNovo} />}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { backgroundColor: "#FFF6DD", borderWidth: 1, borderColor: "#9A7400", borderRadius: raio, padding: 16, gap: 10, marginBottom: 16 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 10 },
  titulo: { flex: 1, fontFamily: fontes.titulo, fontSize: 17, color: "#5C4300" },
  texto: { fontFamily: fontes.texto, fontSize: 15, color: "#5C4300", lineHeight: 22 },
  dica: { fontFamily: fontes.texto, fontSize: 14, color: "#5C4300", lineHeight: 20 },
  botoes: { gap: 10, marginTop: 4 },
});

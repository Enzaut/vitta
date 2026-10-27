import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import { NotaDemonstracao } from "../mapa/Demonstracao";
import { formatarDistancia } from "../mapa/geografia";
import { TiposEmFalta } from "../mapa/TiposEmFalta";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { formatarDataBr } from "../validation/campos";

type Props = NativeStackScreenProps<RootStackParamList, "Instituicao">;

// HU-05, cenário 2: informações completas da instituição. O botão "Agendar Doação" entra junto com a HU-04.
export function InstituicaoScreen({ route }: Props) {
  const { instituicao } = route.params;
  const { nome, endereco, telefone, horario, latitude, longitude, distanciaKm, tiposEmFalta, estoqueAtualizadoEm, demonstracao } = instituicao;
  const [erro, setErro] = useState<string | null>(null);

  async function abrir(endereco: string, mensagemDeErro: string) {
    setErro(null);
    try {
      await Linking.openURL(endereco);
    } catch {
      setErro(mensagemDeErro);
    }
  }

  return (
    <Tela>
      <Text style={estilos.nome} accessibilityRole="header">
        {nome}
      </Text>
      {distanciaKm !== null && <Text style={estilos.distancia}>A {formatarDistancia(distanciaKm)} de você, em linha reta</Text>}

      {demonstracao && <NotaDemonstracao />}
      {erro && <Aviso tipo="erro" texto={erro} aoFechar={() => setErro(null)} />}

      <View style={estilos.cartao}>
        <Informacao icone="location-outline" rotulo="Endereço" valor={endereco} />
        <Informacao icone="call-outline" rotulo="Telefone" valor={telefone ?? "Não informado"} />
        <Informacao icone="time-outline" rotulo="Horário de funcionamento" valor={horario} />
      </View>

      <View style={estilos.cartao}>
        <Text style={estilos.secao}>Tipos sanguíneos em falta</Text>
        <TiposEmFalta tiposEmFalta={tiposEmFalta} estoqueAtualizadoEm={estoqueAtualizadoEm} />
        {estoqueAtualizadoEm && (
          <Text style={estilos.atualizado}>Estoque atualizado em {formatarDataBr(estoqueAtualizadoEm.slice(0, 10))}.</Text>
        )}
      </View>

      <View style={estilos.botoes}>
        <Botao
          titulo="Como chegar"
          aoPressionar={() =>
            abrir(
              `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
              "Não foi possível abrir o mapa neste aparelho.",
            )
          }
        />
        {telefone && (
          <Botao
            titulo="Ligar"
            variante="secundario"
            aoPressionar={() => abrir(`tel:${telefone.replace(/\D/g, "")}`, "Não foi possível abrir o discador neste aparelho.")}
          />
        )}
      </View>

      <Text style={estilos.nota}>Confirme o horário e a disponibilidade com a instituição antes de ir.</Text>
    </Tela>
  );
}

function Informacao({ icone, rotulo, valor }: { icone: keyof typeof Ionicons.glyphMap; rotulo: string; valor: string }) {
  return (
    <View style={estilos.informacao} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Ionicons name={icone} size={22} color={cores.primaria} />
      <View style={estilos.informacaoTexto}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        <Text style={estilos.valor}>{valor}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  nome: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo + 2, color: cores.texto },
  distancia: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.primaria, marginTop: 4 },
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 16, marginTop: 16 },
  secao: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  informacao: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  informacaoTexto: { flex: 1, gap: 2 },
  rotulo: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario },
  valor: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.texto, lineHeight: 22 },
  atualizado: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario },
  botoes: { gap: 12, marginTop: 24 },
  nota: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 19, marginTop: 16 },
});

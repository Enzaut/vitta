import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { CampanhaDoDoador } from "../api/instituicao";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import { lerPosicaoAtual } from "../localizacao/posicaoAtual";
import { formatarDistancia } from "../mapa/geografia";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { formatarDataBr } from "../validation/campos";

type Props = NativeStackScreenProps<RootStackParamList, "Campanhas">;

// Campanhas relâmpago das instituições. As que precisam do tipo sanguíneo do doador vêm primeiro.
export function CampanhasDoadorScreen(_: Props) {
  const { listarCampanhas, doador } = useAuth();
  const [campanhas, setCampanhas] = useState<CampanhaDoDoador[] | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    setCampanhas(undefined);
    // A distância é um extra: sem permissão ou sem GPS, a lista aparece do mesmo jeito, só sem a distância.
    const posicao = await lerPosicaoAtual().catch(() => undefined);
    try {
      setCampanhas(await listarCampanhas(posicao));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar as campanhas.");
      setCampanhas([]);
    }
  }, [listarCampanhas]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <Tela>
      <Text style={estilos.titulo}>Campanhas de doação</Text>
      <Text style={estilos.subtitulo}>Instituições que estão chamando doadores agora.</Text>

      {erro && <Aviso tipo="erro" texto={erro} />}
      {!doador?.tipoSanguineo && campanhas && campanhas.length > 0 && (
        <Text style={estilos.dica}>Informe o seu tipo sanguíneo no perfil para ver quais campanhas precisam de você.</Text>
      )}

      {campanhas === undefined && <ActivityIndicator color={cores.primaria} style={estilos.carregando} />}
      {campanhas?.length === 0 && !erro && <Text style={estilos.vazio}>Nenhuma campanha ativa no momento.</Text>}

      {campanhas?.map((c) => (
        <View key={c.id} style={[estilos.cartao, c.paraMeuTipo && !!doador?.tipoSanguineo && estilos.destaque]}>
          {c.paraMeuTipo && !!doador?.tipoSanguineo && (
            <View style={estilos.precisa}>
              <Ionicons name="heart" size={16} color={cores.primaria} />
              <Text style={estilos.precisaTexto}>Precisa do seu tipo ({doador.tipoSanguineo})</Text>
            </View>
          )}
          <Text style={estilos.cartaoTitulo}>{c.titulo}</Text>
          <Text style={estilos.texto}>{c.descricao}</Text>

          <View style={estilos.linha}>
            <Ionicons name="business-outline" size={18} color={cores.textoSecundario} />
            <Text style={estilos.texto}>
              {c.instituicao.nome} ({c.instituicao.cidade} - {c.instituicao.uf})
              {c.instituicao.distanciaKm !== null ? `, a ${formatarDistancia(c.instituicao.distanciaKm)}` : ""}
            </Text>
          </View>
          <View style={estilos.linha}>
            <Ionicons name="water-outline" size={18} color={cores.textoSecundario} />
            <Text style={estilos.texto}>{c.tiposSanguineos.length > 0 ? c.tiposSanguineos.join(", ") : "Todos os tipos"}</Text>
          </View>
          <View style={estilos.linha}>
            <Ionicons name="calendar-outline" size={18} color={cores.textoSecundario} />
            <Text style={estilos.texto}>Até {formatarDataBr(c.validaAte)}</Text>
          </View>
          {!!c.instituicao.telefone && (
            <View style={estilos.linha}>
              <Ionicons name="call-outline" size={18} color={cores.textoSecundario} />
              <Text style={estilos.texto}>{c.instituicao.telefone}</Text>
            </View>
          )}
        </View>
      ))}

      <Botao titulo="Atualizar" variante="secundario" aoPressionar={carregar} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
  dica: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 19, marginBottom: 12 },
  carregando: { marginVertical: 24 },
  vazio: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, textAlign: "center", marginVertical: 24 },
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 10, marginBottom: 16 },
  destaque: { borderWidth: 1.5, borderColor: cores.primaria },
  precisa: { flexDirection: "row", alignItems: "center", gap: 6 },
  precisaTexto: { fontFamily: fontes.textoMedio, fontSize: 13, color: cores.primaria },
  cartaoTitulo: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  texto: { flexShrink: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
  linha: { flexDirection: "row", alignItems: "center", gap: 8 },
});

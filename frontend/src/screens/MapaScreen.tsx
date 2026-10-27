import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import type { Instituicao } from "../api/instituicoes";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { CampoBusca } from "../components/CampoBusca";
import { useAtraso } from "../hooks/useAtraso";
import { useInstituicoes } from "../hooks/useInstituicoes";
import { useLocalizacao } from "../localizacao/useLocalizacao";
import { CartaoInstituicao } from "../mapa/CartaoInstituicao";
import {
  RAIO_PADRAO_KM,
  alvoDaInstituicao,
  alvoDoRaio,
  arredondarCoordenada,
  descreverPrecisao,
  type Alvo,
} from "../mapa/geografia";
import { MapaInstituicoes } from "../mapa/MapaInstituicoes";
import { MensagemLocalizacao } from "../mapa/MensagemLocalizacao";
import { SeletorRaio } from "../mapa/SeletorRaio";
import type { AbaProps } from "../navigation/types";
import { cores, fontes, tamanhos } from "../theme";

type Props = AbaProps<"Mapa">;

const ALTURA_DO_MAPA = 250;

// HU-05: mapa com as instituições de coleta de sangue perto da pessoa, lista de cards, busca por nome e raio de busca.
// RNF-008: sem permissão, com o GPS desligado ou sem sinal, a tela orienta a pessoa e mantém a busca por nome.
export function MapaScreen({ navigation }: Props) {
  const { listarInstituicoes } = useAuth();
  const { estado, tentarDeNovo, atualizar, revalidar, abrirConfiguracoes, ativarLocalizacao } = useLocalizacao();

  const [raioKm, setRaioKm] = useState(RAIO_PADRAO_KM);
  const [busca, setBusca] = useState("");
  const buscaPronta = useAtraso(busca.trim(), 400);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [centralizando, setCentralizando] = useState(false);
  // Recado curto sobre a localização (ex.: "Perto de mim" não conseguiu atualizar).
  const [recado, setRecado] = useState<string | null>(null);

  const posicao = estado.tipo === "pronta" ? estado.posicao : null;
  // A API recebe a posição arredondada (cerca de 100 m).
  const lat = posicao ? arredondarCoordenada(posicao.latitude) : undefined;
  const lng = posicao ? arredondarCoordenada(posicao.longitude) : undefined;

  // Lista principal: as que estão dentro do raio (com localização) ou todas, em ordem de nome (sem localização).
  const proximas = useInstituicoes(listarInstituicoes, estado.tipo === "verificando" ? null : { lat, lng, raioKm });
  // Busca por nome: acha a instituição em qualquer distância.
  const encontradas = useInstituicoes(listarInstituicoes, buscaPronta ? { lat, lng, busca: buscaPronta } : null);

  // Voltando para esta aba, confere de novo a localização (a pessoa pode ter mudado algo nas configurações).
  const primeiroFoco = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeiroFoco.current) primeiroFoco.current = false;
      else revalidar();
    }, [revalidar]),
  );

  // Cenários 2 e 3: abre os detalhes. Vindo da busca, o mapa também vai até a instituição.
  function abrir(instituicao: Instituicao, daBusca = false) {
    if (daBusca) {
      setAlvo(alvoDaInstituicao(instituicao));
      setBusca("");
      Keyboard.dismiss();
    }
    navigation.navigate("Instituicao", { instituicao });
  }

  // Cenário 4: troca o raio e o mapa mostra o novo círculo.
  function mudarRaio(km: number) {
    setRaioKm(km);
    if (posicao) setAlvo(alvoDoRaio(posicao, km));
  }

  // Comando "Perto de mim": lê a posição de novo e volta o mapa para a pessoa.
  async function irParaMim() {
    setCentralizando(true);
    setRecado(null);
    const novo = await atualizar();
    setCentralizando(false);
    if (novo.tipo === "pronta") setAlvo(alvoDoRaio(novo.posicao, raioKm));
    else if (novo.tipo === "indisponivel") setRecado("Não foi possível atualizar a sua localização agora. Tente de novo em instantes.");
  }

  const buscando = busca.trim().length > 0;
  // atual = resposta para o filtro de agora; lista = a que aparece na tela. Enquanto a nova chega, fica a anterior
  // (para não piscar), mas só se for do mesmo tipo: com raio (localização ligada) ou sem raio (localização desligada).
  const atual = proximas.dados;
  const anterior = proximas.anteriores && (proximas.anteriores.raioKm !== null) === (posicao !== null) ? proximas.anteriores : null;
  const lista = atual ?? anterior;
  const precisao = posicao ? descreverPrecisao(posicao) : null;

  const aguardandoBusca = buscando && (busca.trim() !== buscaPronta || (encontradas.dados === null && !encontradas.erro));
  const resultados = encontradas.dados?.instituicoes ?? [];

  return (
    <View style={estilos.tela}>
      <View style={estilos.busca}>
        <CampoBusca valor={busca} aoMudar={setBusca} placeholder="Buscar instituição pelo nome" />
      </View>

      <View style={estilos.corpo}>
        {estado.tipo === "verificando" ? (
          <View style={estilos.centro} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={cores.primaria} />
            <Text style={estilos.centroTexto}>Obtendo a sua localização…</Text>
          </View>
        ) : (
          <>
            {posicao && precisao && (
              <>
                <View style={estilos.areaDoMapa}>
                  <MapaInstituicoes
                    posicao={posicao}
                    raioKm={raioKm}
                    vistaInicial={alvoDoRaio(posicao, raioKm)}
                    alvo={alvo}
                    instituicoes={lista?.instituicoes ?? []}
                    aoAbrir={(instituicao) => abrir(instituicao)}
                  />
                  <View style={estilos.sobreRaio} pointerEvents="box-none">
                    <SeletorRaio valor={raioKm} aoMudar={mudarRaio} />
                  </View>
                  <Pressable
                    onPress={irParaMim}
                    disabled={centralizando}
                    accessibilityRole="button"
                    accessibilityLabel="Perto de mim"
                    accessibilityHint="Centraliza o mapa na sua localização"
                    style={estilos.pertoDeMim}
                  >
                    {centralizando ? (
                      <ActivityIndicator size="small" color={cores.primaria} />
                    ) : (
                      <Ionicons name="locate" size={20} color={cores.primaria} />
                    )}
                    <Text style={estilos.pertoDeMimTexto}>Perto de mim</Text>
                  </Pressable>
                </View>
                <View style={estilos.precisao}>
                  <Ionicons
                    name={recado || precisao.fraca ? "alert-circle-outline" : "locate-outline"}
                    size={16}
                    color={recado ? cores.erro : precisao.fraca ? "#9A7400" : cores.textoSecundario}
                  />
                  <Text
                    style={[estilos.precisaoTexto, precisao.fraca && { color: "#7A5A00" }, !!recado && { color: cores.primariaEscura }]}
                    accessibilityLiveRegion="polite"
                  >
                    {recado ?? precisao.texto}
                  </Text>
                </View>
              </>
            )}

            <FlatList
              data={lista?.instituicoes ?? []}
              keyExtractor={(instituicao) => instituicao.id}
              renderItem={({ item }) => <CartaoInstituicao instituicao={item} aoPressionar={() => abrir(item)} />}
              ItemSeparatorComponent={Separador}
              contentContainerStyle={estilos.lista}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <View>
                  {estado.tipo !== "pronta" && (
                    <MensagemLocalizacao
                      estado={estado}
                      aoAbrirConfiguracoes={abrirConfiguracoes}
                      aoAtivarLocalizacao={ativarLocalizacao}
                      aoTentarDeNovo={tentarDeNovo}
                    />
                  )}
                  {proximas.erro && (
                    <View>
                      <Aviso tipo="erro" texto={proximas.erro} />
                      <Botao titulo="Tentar de novo" variante="secundario" aoPressionar={proximas.recarregar} />
                    </View>
                  )}
                  {lista && (
                    <View style={estilos.cabecalhoDaLista}>
                      <Text style={estilos.contagemTexto} accessibilityRole="header">
                        {textoDaContagem(lista.total, lista.raioKm)}
                      </Text>
                      {proximas.carregando && <ActivityIndicator size="small" color={cores.primaria} />}
                    </View>
                  )}
                </View>
              }
              ListEmptyComponent={
                atual ? (
                  <Text style={estilos.vazio}>
                    {atual.raioKm !== null
                      ? `Nenhuma instituição encontrada em até ${atual.raioKm} km. Aumente o raio de busca ou busque pelo nome.`
                      : "Nenhuma instituição cadastrada."}
                  </Text>
                ) : proximas.carregando ? (
                  <ActivityIndicator size="large" color={cores.primaria} style={estilos.carregandoLista} />
                ) : undefined
              }
            />
          </>
        )}

        {buscando && (
          <View style={estilos.resultados}>
            <FlatList
              data={resultados}
              keyExtractor={(instituicao) => instituicao.id}
              renderItem={({ item }) => <CartaoInstituicao instituicao={item} aoPressionar={() => abrir(item, true)} />}
              ItemSeparatorComponent={Separador}
              contentContainerStyle={estilos.lista}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
              ListHeaderComponent={
                <View>
                  {encontradas.erro && (
                    <View>
                      <Aviso tipo="erro" texto={encontradas.erro} />
                      <Botao titulo="Tentar de novo" variante="secundario" aoPressionar={encontradas.recarregar} />
                    </View>
                  )}
                  {aguardandoBusca ? (
                    <ActivityIndicator size="small" color={cores.primaria} style={estilos.carregandoBusca} />
                  ) : (
                    encontradas.dados && (
                      <View style={estilos.cabecalhoDaLista}>
                        <Text style={estilos.contagemTexto} accessibilityRole="header">
                          {encontradas.dados.total === 1 ? "1 resultado" : `${encontradas.dados.total} resultados`} para “{buscaPronta}”
                        </Text>
                      </View>
                    )
                  )}
                </View>
              }
              ListEmptyComponent={
                !aguardandoBusca && encontradas.dados ? (
                  <Text style={estilos.vazio}>Nenhuma instituição encontrada. Confira o nome ou digite só uma parte dele.</Text>
                ) : undefined
              }
            />
          </View>
        )}
      </View>
    </View>
  );
}

const Separador = () => <View style={estilos.separador} />;

function textoDaContagem(total: number, raioKm: number | null): string {
  const instituicoes = total === 1 ? "1 instituição" : `${total} instituições`;
  return raioKm === null ? `${instituicoes}, em ordem alfabética` : `${instituicoes} em até ${raioKm} km`;
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  busca: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  corpo: { flex: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  centroTexto: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario },
  areaDoMapa: { height: ALTURA_DO_MAPA, backgroundColor: cores.fundoSecundario },
  sobreRaio: { position: "absolute", top: 10, left: 10, right: 10 },
  pertoDeMim: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pertoDeMimTexto: { fontFamily: fontes.botao, fontSize: 14, color: cores.primaria },
  precisao: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: cores.fundoSecundario },
  precisaoTexto: { flex: 1, fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 18 },
  lista: { padding: 16, paddingBottom: 24 },
  separador: { height: 12 },
  cabecalhoDaLista: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  contagemTexto: { flex: 1, fontFamily: fontes.subtitulo, fontSize: 16, color: cores.texto },
  vazio: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 21, textAlign: "center", marginTop: 8 },
  carregandoLista: { marginTop: 24 },
  carregandoBusca: { alignSelf: "flex-start", marginBottom: 12 },
  resultados: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: cores.fundo },
});

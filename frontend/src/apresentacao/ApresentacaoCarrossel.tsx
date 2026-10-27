import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Botao } from "../components/Botao";
import { cores, fontes, tamanhos } from "../theme";
import { Ilustracao } from "./Ilustracao";
import { SLIDES, type Slide } from "./slides";

type Props = {
  // Chamado ao tocar no botão da última tela ou em "Pular".
  aoConcluir: () => void;
  textoFinal?: string;
  textoPular?: string;
};

// Carrossel de boas-vindas: a ideia do app, por que doar sangue vale a pena e como o VITTA funciona.
// Passa de tela arrastando o dedo, no botão "Próximo" ou (no Android) pelo botão voltar.
export function ApresentacaoCarrossel({ aoConcluir, textoFinal = "Começar", textoPular = "Pular" }: Props) {
  const { width, height } = useWindowDimensions();
  const lista = useRef<FlatList<Slide>>(null);
  const [indice, setIndice] = useState(0);
  // Tela para onde o botão (ou o voltar do Android) está levando. Enquanto o carrossel não chega lá, o arrastar não mexe nos pontinhos.
  const destino = useRef<number | null>(null);
  const ultimo = indice === SLIDES.length - 1;

  const irPara = useCallback((posicao: number) => {
    destino.current = posicao;
    lista.current?.scrollToIndex({ index: posicao, animated: true });
    setIndice(posicao);
  }, []);

  // Botão voltar do Android: volta uma tela do carrossel em vez de sair dele.
  useEffect(() => {
    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      if (indice === 0) return false;
      irPara(indice - 1);
      return true;
    });
    return () => assinatura.remove();
  }, [indice, irPara]);

  // Acompanha o dedo: os pontinhos e o botão mudam assim que mais da metade da próxima tela aparece.
  function aoRolar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    const posicao = Math.round(evento.nativeEvent.contentOffset.x / width);
    if (destino.current !== null) {
      if (posicao === destino.current) destino.current = null;
      return;
    }
    setIndice(posicao);
  }

  return (
    <SafeAreaView style={estilos.tela}>
      <View style={estilos.topo}>
        {!ultimo && (
          <Pressable onPress={aoConcluir} hitSlop={12} accessibilityRole="button" accessibilityLabel={`${textoPular} a apresentação`}>
            <Text style={estilos.pular}>{textoPular}</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={lista}
        data={SLIDES}
        keyExtractor={(slide) => slide.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialNumToRender={SLIDES.length}
        onScroll={aoRolar}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          destino.current = null;
        }}
        getItemLayout={(_, posicao) => ({ length: width, offset: width * posicao, index: posicao })}
        renderItem={({ item }) => <Pagina slide={item} largura={width} altura={height} />}
      />

      <View style={estilos.rodape}>
        <View style={estilos.pontos} accessible accessibilityLabel={`Tela ${indice + 1} de ${SLIDES.length}`} accessibilityLiveRegion="polite">
          {SLIDES.map((slide, posicao) => (
            <View key={slide.id} style={[estilos.ponto, posicao === indice && estilos.pontoAtivo]} />
          ))}
        </View>
        <Botao titulo={ultimo ? textoFinal : "Próximo"} aoPressionar={ultimo ? aoConcluir : () => irPara(indice + 1)} />
      </View>
    </SafeAreaView>
  );
}

function Pagina({ slide, largura, altura }: { slide: Slide; largura: number; altura: number }) {
  // A ilustração é 4:3. Em telas baixas ela encolhe para sobrar espaço para o texto.
  const alturaDoDesenho = Math.min(((largura - 48) * 3) / 4, altura * 0.33, 260);

  return (
    <View style={{ width: largura }}>
      <ScrollView contentContainerStyle={estilos.pagina} showsVerticalScrollIndicator={false}>
        <View style={{ width: (alturaDoDesenho * 4) / 3, height: alturaDoDesenho }}>
          <Ilustracao nome={slide.ilustracao} />
        </View>

        <Titulo texto={slide.titulo} />

        {!!slide.texto && <Text style={estilos.texto}>{slide.texto}</Text>}

        {!!slide.itens && (
          <View style={estilos.itens}>
            {slide.itens.map((item) => (
              <View key={item.texto} style={estilos.item}>
                <View style={estilos.itemIcone}>
                  <Ionicons name={item.icone} size={20} color={cores.primaria} />
                </View>
                <View style={estilos.itemCorpo}>
                  <Text style={estilos.itemTexto}>{item.texto}</Text>
                  {item.emBreve && (
                    <View style={estilos.emBreve}>
                      <Text style={estilos.emBreveTexto}>EM BREVE</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {!!slide.fonte && <Text style={estilos.fonte}>{slide.fonte}</Text>}
      </ScrollView>
    </View>
  );
}

// As palavras entre *asteriscos* ficam em vermelho.
function Titulo({ texto }: { texto: string }) {
  return (
    <Text style={estilos.titulo} accessibilityRole="header">
      {texto.split("*").map((parte, posicao) =>
        posicao % 2 === 1 ? (
          <Text key={posicao} style={estilos.destaque}>
            {parte}
          </Text>
        ) : (
          parte
        ),
      )}
    </Text>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { height: 44, alignItems: "flex-end", justifyContent: "center", paddingHorizontal: 24 },
  pular: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.textoSecundario },
  pagina: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 8, gap: 14 },
  titulo: { fontFamily: fontes.titulo, fontSize: 26, lineHeight: 34, color: cores.texto, textAlign: "center" },
  destaque: { color: cores.primaria },
  texto: { fontFamily: fontes.texto, fontSize: tamanhos.texto, lineHeight: 24, color: cores.textoSecundario, textAlign: "center" },
  itens: { alignSelf: "stretch", gap: 12 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  itemIcone: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: cores.fundoErro },
  itemCorpo: { flex: 1, gap: 4, paddingTop: 1 },
  itemTexto: { fontFamily: fontes.texto, fontSize: 15, lineHeight: 22, color: cores.texto },
  emBreve: { alignSelf: "flex-start", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "#FFF6DD", borderWidth: 1, borderColor: "#9A7400" },
  emBreveTexto: { fontFamily: fontes.botao, fontSize: 11, color: "#7A5A00", letterSpacing: 0.4 },
  fonte: { fontFamily: fontes.texto, fontSize: 12, lineHeight: 17, color: cores.textoSecundario, textAlign: "center" },
  rodape: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 16 },
  pontos: { flexDirection: "row", justifyContent: "center", gap: 8 },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: cores.borda },
  pontoAtivo: { width: 24, backgroundColor: cores.primaria },
});

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { Instituicao } from "../api/instituicoes";
import { Botao } from "../components/Botao";
import { cores, fontes, raio, tamanhos } from "../theme";

type Props = {
  // Nulo enquanto carrega.
  instituicoes: Instituicao[] | null;
  erroDeCarga: string | null;
  aoTentarDeNovo: () => void;
  valorId: string | null;
  aoMudar: (id: string) => void;
  erro?: string;
};

// Campo "Instituição" do formulário de agendamento (HU-04): abre a lista e fecha ao escolher.
export function SeletorDeInstituicao({ instituicoes, erroDeCarga, aoTentarDeNovo, valorId, aoMudar, erro }: Props) {
  const [aberto, setAberto] = useState(false);
  const escolhida = instituicoes?.find((i) => i.id === valorId) ?? null;

  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>Instituição</Text>

      {erroDeCarga ? (
        <View style={estilos.falha}>
          <Text style={estilos.falhaTexto}>{erroDeCarga}</Text>
          <Botao titulo="Tentar de novo" variante="secundario" aoPressionar={aoTentarDeNovo} />
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => setAberto((atual) => !atual)}
            disabled={instituicoes === null}
            accessibilityRole="button"
            accessibilityLabel={escolhida ? `Instituição: ${escolhida.nome}. Toque para trocar.` : "Escolher a instituição"}
            accessibilityState={{ expanded: aberto, disabled: instituicoes === null }}
            style={[estilos.campo, !!erro && estilos.campoComErro]}
          >
            <Ionicons name="business-outline" size={22} color={cores.primaria} />
            {instituicoes === null ? (
              <>
                <Text style={[estilos.campoTexto, estilos.placeholder]}>Carregando instituições…</Text>
                <ActivityIndicator color={cores.primaria} />
              </>
            ) : (
              <>
                <Text style={[estilos.campoTexto, !escolhida && estilos.placeholder]} numberOfLines={2}>
                  {escolhida ? escolhida.nome : "Escolha a instituição"}
                </Text>
                <Ionicons name={aberto ? "chevron-up" : "chevron-down"} size={22} color={cores.textoSecundario} />
              </>
            )}
          </Pressable>

          {aberto && instituicoes && (
            <View style={estilos.lista} accessibilityRole="radiogroup">
              {instituicoes.map((instituicao) => {
                const selecionada = instituicao.id === valorId;
                return (
                  <Pressable
                    key={instituicao.id}
                    onPress={() => {
                      aoMudar(instituicao.id);
                      setAberto(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={`${instituicao.nome}, ${instituicao.cidade}`}
                    aria-checked={selecionada}
                    style={({ pressed }) => [estilos.opcao, selecionada && estilos.opcaoSelecionada, pressed && !selecionada && estilos.opcaoPressionada]}
                  >
                    <View style={estilos.opcaoTextos}>
                      <Text style={[estilos.opcaoNome, selecionada && estilos.opcaoNomeSelecionada]}>{instituicao.nome}</Text>
                      <Text style={estilos.opcaoCidade}>{instituicao.cidade} - {instituicao.uf}</Text>
                    </View>
                    {selecionada && <Ionicons name="checkmark-circle" size={22} color={cores.primaria} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}

      {!!erro && (
        <Text style={estilos.erro} accessibilityRole="alert">
          {erro}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { marginBottom: 24 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.texto, marginBottom: 8 },
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: raio,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  campoComErro: { borderColor: cores.erro, backgroundColor: cores.fundoErro },
  campoTexto: { flex: 1, fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.texto },
  placeholder: { color: cores.textoSecundario, fontFamily: fontes.texto },
  lista: { marginTop: 8, borderRadius: raio, borderWidth: 1.5, borderColor: cores.borda, overflow: "hidden", backgroundColor: cores.fundo },
  opcao: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: cores.fundoSecundario },
  opcaoSelecionada: { backgroundColor: cores.fundoErro },
  opcaoPressionada: { backgroundColor: cores.fundoSecundario },
  opcaoTextos: { flex: 1, gap: 2 },
  opcaoNome: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.texto },
  opcaoNomeSelecionada: { color: cores.primariaEscura },
  opcaoCidade: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario },
  falha: { gap: 12 },
  falhaTexto: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.erro, lineHeight: 20 },
  erro: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.erro, marginTop: 6 },
});

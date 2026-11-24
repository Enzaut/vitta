import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ApiError } from "../api/client";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { SeletorDeTipos } from "../components/SeletorDeTipos";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, tamanhos } from "../theme";
import { useInstituicao } from "./InstituicaoContext";

type Props = NativeStackScreenProps<RootStackParamList, "Estoque">;

// A instituição marca os tipos sanguíneos que estão em falta. Os doadores veem esse alerta nos cards do mapa (RN08).
export function EstoqueScreen({ navigation }: Props) {
  const { painel, atualizarEstoque } = useInstituicao();
  const [tipos, setTipos] = useState<string[]>(painel?.instituicao?.tiposEmFalta ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      await atualizarEstoque(tipos);
      navigation.goBack();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar o estoque. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>Estoque de sangue</Text>
      <Text style={estilos.subtitulo}>Marque os tipos que estão em falta agora. Se nenhum estiver em falta, deixe tudo desmarcado.</Text>

      {erro && <Aviso tipo="erro" texto={erro} aoFechar={() => setErro(null)} />}

      <SeletorDeTipos
        rotulo="Tipos em falta"
        valor={tipos}
        aoMudar={setTipos}
        dica="Ao salvar, o app registra a data de hoje como a da última atualização do estoque."
      />

      <Botao titulo="Salvar estoque" aoPressionar={salvar} carregando={enviando} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
});

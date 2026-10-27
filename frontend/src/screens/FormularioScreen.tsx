import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from "react-native";
import type { Modelo } from "../api/formulario";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import { ListaDeCampos } from "../formulario/CamposDoFormulario";
import {
  blocoDoErro,
  blocosVisiveis,
  mensagemGeral,
  montarRespostas,
  validarBloco,
  type Erros,
  type Estado,
} from "../formulario/logica";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Formulario">;

// HU-03: o formulário, um bloco de perguntas por passo. As perguntas vêm da API.
export function FormularioScreen({ navigation }: Props) {
  const { buscarModeloDoFormulario, enviarFormulario } = useAuth();

  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [erroModelo, setErroModelo] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({});
  const [etapa, setEtapa] = useState(0);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Muda a cada passo ou tentativa com erro, para a tela voltar ao topo.
  const [chaveRolagem, setChaveRolagem] = useState(0);

  const carregarModelo = useCallback(async () => {
    setErroModelo(null);
    try {
      setModelo(await buscarModeloDoFormulario());
    } catch (erro) {
      setErroModelo(erro instanceof ApiError ? erro.message : "Não foi possível carregar o formulário. Tente novamente.");
    }
  }, [buscarModeloDoFormulario]);

  useEffect(() => {
    void carregarModelo();
  }, [carregarModelo]);

  const blocos = modelo ? blocosVisiveis(modelo, estado) : [];
  const indice = Math.min(etapa, Math.max(blocos.length - 1, 0));
  const bloco = blocos[indice];
  const ultimo = indice === blocos.length - 1;

  function irPara(novaEtapa: number) {
    setEtapa(novaEtapa);
    setChaveRolagem((k) => k + 1);
  }

  const voltar = useCallback(() => {
    setErros({});
    setErroGeral(null);
    setEtapa((atual) => Math.max(atual - 1, 0));
    setChaveRolagem((k) => k + 1);
  }, []);

  // Botão voltar do Android: volta ao passo anterior em vez de sair do formulário.
  useEffect(() => {
    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      if (etapa > 0) {
        voltar();
        return true;
      }
      return false;
    });
    return () => assinatura.remove();
  }, [etapa, voltar]);

  function aoMudar(id: string, valor: unknown) {
    setEstado((atual) => ({ ...atual, [id]: valor }));
    // Quem corrige uma resposta não precisa ver o erro dela de novo.
    setErros((atual) => Object.fromEntries(Object.entries(atual).filter(([chave]) => chave !== id && !chave.startsWith(`${id}.`))));
  }

  async function continuar() {
    if (!modelo || !bloco) return;

    const doBloco = validarBloco(bloco, estado);
    if (Object.keys(doBloco).length > 0) {
      setErros(doBloco);
      setErroGeral(mensagemGeral(doBloco));
      setChaveRolagem((k) => k + 1);
      return;
    }
    setErros({});
    setErroGeral(null);

    if (!ultimo) {
      irPara(indice + 1);
      return;
    }

    // Último passo: confere todos os blocos de novo antes de enviar.
    const todos: Erros = {};
    for (const b of blocos) Object.assign(todos, validarBloco(b, estado));
    if (Object.keys(todos).length > 0) {
      mostrarErros(todos, mensagemGeral(todos));
      return;
    }

    setEnviando(true);
    try {
      await enviarFormulario(montarRespostas(modelo, estado));
      // O formulário sai da pilha: voltar do resultado leva direto à tela inicial.
      navigation.reset({ index: 1, routes: [{ name: "Abas" }, { name: "ResultadoFormulario" }] });
    } catch (erro) {
      if (erro instanceof ApiError && erro.campos) mostrarErros(erro.campos, erro.message);
      else setErroGeral(erro instanceof ApiError ? erro.message : "Não foi possível enviar o formulário. Tente novamente.");
      setChaveRolagem((k) => k + 1);
    } finally {
      setEnviando(false);
    }
  }

  // Mostra os erros e volta ao primeiro bloco que tem erro.
  function mostrarErros(novos: Erros, mensagem: string) {
    setErros(novos);
    setErroGeral(mensagem);
    const primeiro = blocoDoErro(blocos, Object.keys(novos)[0] ?? "");
    irPara(primeiro >= 0 ? primeiro : indice);
  }

  if (erroModelo) {
    return (
      <Tela centralizar>
        <Aviso tipo="erro" texto={erroModelo} />
        <Botao titulo="Tentar de novo" aoPressionar={carregarModelo} />
      </Tela>
    );
  }

  if (!modelo || !bloco) {
    return (
      <Tela centralizar>
        <ActivityIndicator size="large" color={cores.primaria} />
      </Tela>
    );
  }

  return (
    <Tela chaveRolagem={chaveRolagem}>
      <Text style={estilos.passo} accessibilityRole="header">
        Passo {indice + 1} de {blocos.length}
      </Text>
      <View style={estilos.trilha} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: blocos.length, now: indice + 1 }}>
        <View style={[estilos.progresso, { width: `${((indice + 1) / blocos.length) * 100}%` }]} />
      </View>

      <Text style={[estilos.titulo, !bloco.introducao && estilos.tituloSemIntroducao]}>{bloco.titulo}</Text>
      {!!bloco.introducao && !bloco.sensivel && <Text style={estilos.introducao}>{bloco.introducao}</Text>}
      {bloco.sensivel && (
        <View style={estilos.confidencial}>
          <Ionicons name="lock-closed-outline" size={20} color={cores.primaria} />
          <Text style={estilos.confidencialTexto}>{bloco.introducao}</Text>
        </View>
      )}

      {erroGeral && <Aviso tipo="erro" texto={erroGeral} />}

      <ListaDeCampos campos={bloco.campos} escopo={estado} aoMudar={aoMudar} erros={erros} prefixo="" />

      <View style={estilos.botoes}>
        <Botao titulo={ultimo ? "Enviar formulário" : "Continuar"} aoPressionar={continuar} carregando={enviando} />
        {indice > 0 && <Botao titulo="Voltar" variante="secundario" aoPressionar={voltar} desabilitado={enviando} />}
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  passo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario },
  trilha: { height: 6, borderRadius: 3, backgroundColor: cores.fundoSecundario, marginTop: 8, marginBottom: 20, overflow: "hidden" },
  progresso: { height: 6, borderRadius: 3, backgroundColor: cores.primaria },
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo, color: cores.texto, marginBottom: 6 },
  tituloSemIntroducao: { marginBottom: 16 },
  introducao: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20, marginBottom: 18 },
  confidencial: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: cores.fundoSecundario,
    borderRadius: raio,
    padding: 14,
    marginBottom: 18,
  },
  confidencialTexto: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
  botoes: { gap: 12, marginTop: 8 },
});

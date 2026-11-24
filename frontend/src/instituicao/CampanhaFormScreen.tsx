import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ApiError } from "../api/client";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Campo, type EntradaRef } from "../components/Campo";
import { SeletorDeTipos } from "../components/SeletorDeTipos";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, tamanhos } from "../theme";
import { OBRIGATORIO, dataEmDias, dataFinalParaIso, formatarDataBr, mascararData } from "../validation/campos";
import { useInstituicao } from "./InstituicaoContext";

type Props = NativeStackScreenProps<RootStackParamList, "CampanhaForm">;
type NomeDoCampo = "titulo" | "descricao" | "tiposSanguineos" | "validaAte";
type Erros = Partial<Record<NomeDoCampo, string>>;

// Criar uma campanha relâmpago ou editar uma que já existe (rota com "campanha").
export function CampanhaFormScreen({ navigation, route }: Props) {
  const campanha = route.params?.campanha;
  const { criarCampanha, atualizarCampanha } = useInstituicao();

  const [titulo, setTitulo] = useState(campanha?.titulo ?? "");
  const [descricao, setDescricao] = useState(campanha?.descricao ?? "");
  const [tipos, setTipos] = useState<string[]>(campanha?.tiposSanguineos ?? []);
  const [data, setData] = useState(campanha ? formatarDataBr(campanha.validaAte) : dataEmDias(7));
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const descricaoRef = useRef<EntradaRef>(null);
  const dataRef = useRef<EntradaRef>(null);

  function limparErro(campo: NomeDoCampo) {
    setErros(({ [campo]: _removido, ...resto }) => resto);
  }

  function validar(): Erros {
    const novos: Erros = {};
    if (!titulo.trim()) novos.titulo = OBRIGATORIO;
    else if (titulo.trim().length < 3) novos.titulo = "O título deve ter pelo menos 3 caracteres.";
    if (!descricao.trim()) novos.descricao = OBRIGATORIO;
    else if (descricao.trim().length < 10) novos.descricao = "A descrição deve ter pelo menos 10 caracteres.";
    if (!data) novos.validaAte = OBRIGATORIO;
    else if (!dataFinalParaIso(data)) novos.validaAte = "Informe uma data válida de hoje em diante (DD/MM/AAAA).";
    return novos;
  }

  async function enviar() {
    setErroGeral(null);
    const novos = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    const dados = {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tiposSanguineos: tipos,
      validaAte: dataFinalParaIso(data)!,
    };
    setEnviando(true);
    try {
      if (campanha) await atualizarCampanha(campanha.id, dados);
      else await criarCampanha(dados);
      navigation.goBack();
    } catch (erro) {
      if (erro instanceof ApiError && erro.campos) setErros(erro.campos as Erros);
      else setErroGeral(erro instanceof ApiError ? erro.message : "Não foi possível salvar a campanha. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>{campanha ? "Editar campanha" : "Nova campanha"}</Text>
      <Text style={estilos.subtitulo}>Os doadores veem a campanha na lista do app até a data final.</Text>

      {erroGeral && <Aviso tipo="erro" texto={erroGeral} aoFechar={() => setErroGeral(null)} />}

      <Campo
        rotulo="Título"
        icone="megaphone-outline"
        placeholder="Faltam doadores de O negativo"
        value={titulo}
        onChangeText={(t) => {
          setTitulo(t);
          limparErro("titulo");
        }}
        erro={erros.titulo}
        autoCapitalize="sentences"
        maxLength={80}
        returnKeyType="next"
        onSubmitEditing={() => descricaoRef.current?.focus()}
      />

      <Campo
        ref={descricaoRef}
        rotulo="Descrição"
        icone="document-text-outline"
        placeholder="Explique por que a campanha existe e como participar."
        value={descricao}
        onChangeText={(t) => {
          setDescricao(t);
          limparErro("descricao");
        }}
        erro={erros.descricao}
        autoCapitalize="sentences"
        multiline
        maxLength={500}
        style={estilos.descricao}
      />

      <SeletorDeTipos
        rotulo="Tipos sanguíneos procurados"
        valor={tipos}
        aoMudar={(novos) => {
          setTipos(novos);
          limparErro("tiposSanguineos");
        }}
        dica={tipos.length === 0 ? "Nenhum tipo marcado: a campanha vale para todos os tipos." : undefined}
        erro={erros.tiposSanguineos}
      />

      <Campo
        ref={dataRef}
        rotulo="Vale até"
        icone="calendar-outline"
        placeholder="DD/MM/AAAA"
        value={data}
        onChangeText={(t) => {
          setData(mascararData(t));
          limparErro("validaAte");
        }}
        erro={erros.validaAte}
        keyboardType="number-pad"
        maxLength={10}
        returnKeyType="done"
        onSubmitEditing={enviar}
      />

      <Botao titulo={campanha ? "Salvar alterações" : "Publicar campanha"} aoPressionar={enviar} carregando={enviando} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
  descricao: { minHeight: 96, textAlignVertical: "top" },
});

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ApiError } from "../api/client";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Campo, type EntradaRef } from "../components/Campo";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, tamanhos } from "../theme";
import { MSG_TELEFONE, OBRIGATORIO, mascararTelefone, telefoneValido } from "../validation/campos";
import { useInstituicao } from "./InstituicaoContext";

type Props = NativeStackScreenProps<RootStackParamList, "DadosInstituicao">;
type Erros = { telefone?: string; horario?: string };

// Telefone e horário de atendimento da instituição que já está no mapa.
export function DadosInstituicaoScreen({ navigation }: Props) {
  const { painel, atualizarDados } = useInstituicao();
  const instituicao = painel?.instituicao;

  const [telefone, setTelefone] = useState(mascararTelefone(instituicao?.telefone ?? ""));
  const [horario, setHorario] = useState(instituicao?.horario ?? "");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const horarioRef = useRef<EntradaRef>(null);

  async function salvar() {
    setErroGeral(null);
    const novos: Erros = {};
    if (telefone && !telefoneValido(telefone)) novos.telefone = MSG_TELEFONE;
    if (!horario.trim()) novos.horario = OBRIGATORIO;
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);
    try {
      // Telefone vazio apaga o telefone.
      await atualizarDados({ telefone: telefone || null, horario: horario.trim() });
      navigation.goBack();
    } catch (erro) {
      if (erro instanceof ApiError && erro.campos) setErros(erro.campos as Erros);
      else setErroGeral(erro instanceof ApiError ? erro.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={estilos.titulo}>Telefone e horário</Text>
      <Text style={estilos.subtitulo}>Os doadores veem estes dados nos detalhes da instituição.</Text>

      {erroGeral && <Aviso tipo="erro" texto={erroGeral} aoFechar={() => setErroGeral(null)} />}

      <Campo
        rotulo="Telefone (opcional)"
        icone="call-outline"
        placeholder="(61) 3327-4413"
        value={telefone}
        onChangeText={(t) => {
          setTelefone(mascararTelefone(t));
          setErros((atual) => ({ ...atual, telefone: undefined }));
        }}
        erro={erros.telefone}
        keyboardType="phone-pad"
        maxLength={15}
        returnKeyType="next"
        onSubmitEditing={() => horarioRef.current?.focus()}
      />

      <Campo
        ref={horarioRef}
        rotulo="Horário de atendimento"
        icone="time-outline"
        value={horario}
        onChangeText={(t) => {
          setHorario(t);
          setErros((atual) => ({ ...atual, horario: undefined }));
        }}
        erro={erros.horario}
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={salvar}
      />

      <Botao titulo="Salvar" aoPressionar={salvar} carregando={enviando} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
});

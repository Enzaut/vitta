import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { Formulario } from "../api/formulario";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import { aindaEmEspera, aparenciaDo } from "../formulario/aparencia";
import type { AbaProps } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { formatarDataBr, primeiroNome } from "../validation/campos";

type Props = AbaProps<"Inicio">;

export function InicioScreen({ navigation }: Props) {
  const { doador, aviso, limparAviso, sair, formulario, carregarFormulario, irParaFormulario, concluirRedirecionamento } = useAuth();

  // HU-01, cenário 1: logo depois do cadastro, a pessoa é levada ao formulário de elegibilidade.
  useEffect(() => {
    if (irParaFormulario && formulario === null) {
      concluirRedirecionamento();
      navigation.navigate("FormularioIntro");
    }
  }, [irParaFormulario, formulario, concluirRedirecionamento, navigation]);

  // A validade (7 dias) e a espera (3 dias) passam com o tempo: sempre que esta tela volta a aparecer, confere o formulário de novo.
  useFocusEffect(
    useCallback(() => {
      void carregarFormulario();
    }, [carregarFormulario]),
  );

  return (
    <Tela>
      <Text style={estilos.titulo}>Olá, {primeiroNome(doador?.nome ?? "")}!</Text>
      <Text style={estilos.subtitulo}>Que bom ter você no VITTA.</Text>

      {aviso && <Aviso tipo={aviso.tipo} texto={aviso.texto} aoFechar={limparAviso} />}

      <View style={estilos.cartao}>
        <Ionicons name="clipboard-outline" size={28} color={cores.primaria} />
        <Text style={estilos.cartaoTitulo}>Formulário de elegibilidade</Text>

        {formulario === undefined && (
          <>
            <ActivityIndicator color={cores.primaria} style={estilos.carregando} />
            <Text style={estilos.cartaoTexto}>Carregando o seu formulário…</Text>
            <Botao titulo="Tentar de novo" variante="secundario" aoPressionar={carregarFormulario} />
          </>
        )}

        {formulario === null && (
          <>
            <Text style={estilos.cartaoTexto}>Responda ao formulário para liberar o agendamento de doações.</Text>
            <Botao titulo="Responder agora" aoPressionar={() => navigation.navigate("FormularioIntro")} />
          </>
        )}

        {formulario && (
          <RespostaDoFormulario
            formulario={formulario}
            aoVerResultado={() => navigation.navigate("ResultadoFormulario")}
            aoResponder={() => navigation.navigate("FormularioIntro")}
          />
        )}
      </View>

      <View style={estilos.botoes}>
        <Botao titulo="Sair" variante="secundario" aoPressionar={sair} />
      </View>
    </Tela>
  );
}

type RespostaProps = { formulario: Formulario; aoVerResultado: () => void; aoResponder: () => void };

// A resposta do formulário: passou ou não passou, até quando vale e, para quem não passou, quando pode responder de novo.
function RespostaDoFormulario({ formulario, aoVerResultado, aoResponder }: RespostaProps) {
  const visual = aparenciaDo(formulario);
  const emEspera = aindaEmEspera(formulario);

  return (
    <>
      <View style={[estilos.situacao, { backgroundColor: visual.fundo }]}>
        <Ionicons name={visual.icone} size={22} color={visual.cor} />
        <Text style={[estilos.situacaoTexto, { color: visual.cor }]}>{visual.titulo}</Text>
      </View>
      <Text style={estilos.cartaoTexto}>
        {formulario.agendamentoLiberado
          ? `Agendamento liberado. O formulário vale até ${formatarDataBr(formulario.validoAte)}.`
          : formulario.bloqueioAgendamento}
      </Text>
      {formulario.agendamentoLiberado && (
        <Text style={estilos.dica}>Antes de cada agendamento, o app confere se você passou e se o formulário ainda vale.</Text>
      )}
      <Botao titulo="Ver resultado" variante="secundario" aoPressionar={aoVerResultado} />
      <Botao
        titulo="Responder de novo"
        variante={formulario.vencido || (!formulario.aprovado && !emEspera) ? "primario" : "secundario"}
        desabilitado={emEspera}
        aoPressionar={aoResponder}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 12, marginBottom: 24 },
  cartaoTitulo: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  cartaoTexto: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
  dica: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 19 },
  carregando: { alignSelf: "flex-start" },
  situacao: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: raio, paddingVertical: 10, paddingHorizontal: 12 },
  situacaoTexto: { flex: 1, fontFamily: fontes.botao, fontSize: tamanhos.texto },
  botoes: { gap: 12 },
});

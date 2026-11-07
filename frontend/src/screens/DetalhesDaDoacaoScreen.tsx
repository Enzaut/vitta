import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { dataPorExtenso } from "../agendamento/formatacao";
import { useAuth } from "../auth/AuthContext";
import { Tela } from "../components/Tela";
import { formatarDataHora } from "../formulario/aparencia";
import { ResumoDePontos } from "../gamificacao/ResumoDePontos";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "DetalhesDaDoacao">;

// HU-06, cenário 4: os detalhes de uma doação confirmada (instituição, data e hora, tipo sanguíneo doado,
// pontos ganhos nesta doação) e a patente de agora.
export function DetalhesDaDoacaoScreen({ route }: Props) {
  const { agendamento } = route.params;
  const { gamificacao, carregarAgendamento } = useAuth();
  const { instituicao, medico } = agendamento;

  // Os pontos e a patente podem ter mudado desde a última vez que o app olhou.
  useFocusEffect(
    useCallback(() => {
      void carregarAgendamento();
    }, [carregarAgendamento]),
  );

  return (
    <Tela>
      <View style={estilos.cabecalho}>
        <Ionicons name="checkmark-circle" size={36} color={cores.sucesso} />
        <View style={estilos.cabecalhoTextos}>
          <Text style={estilos.titulo}>Doação confirmada</Text>
          <Text style={estilos.subtitulo}>
            {dataPorExtenso(agendamento.data)}, {agendamento.hora}
          </Text>
        </View>
      </View>

      <View style={estilos.cartao}>
        <Linha rotulo="Instituição" valor={instituicao.nome} detalhe={instituicao.endereco} />
        <Linha rotulo="Atendimento" valor={medico.nome} detalhe={medico.especialidade} />
        <Linha rotulo="Tipo sanguíneo doado" valor={agendamento.tipoSanguineo} />
        <Linha rotulo="Pontos ganhos nesta doação" valor={`+${agendamento.pontosGanhos ?? 0} pontos`} destaque />
        {agendamento.finalizadoEm && <Linha rotulo="Confirmada em" valor={formatarDataHora(agendamento.finalizadoEm)} />}
        <Linha rotulo="Protocolo" valor={agendamento.protocolo} />
      </View>

      <View style={estilos.cartao}>
        <Text style={estilos.secao}>Sua patente agora</Text>
        {gamificacao ? (
          <ResumoDePontos resumo={gamificacao} />
        ) : (
          <Text style={estilos.carregando}>Carregando os seus pontos…</Text>
        )}
      </View>
    </Tela>
  );
}

function Linha({ rotulo, valor, detalhe, destaque = false }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <View style={estilos.linha} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={[estilos.valor, destaque && estilos.valorDestaque]}>{valor}</Text>
      {!!detalhe && <Text style={estilos.detalhe}>{detalhe}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  cabecalhoTextos: { flex: 1 },
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo + 2, color: cores.texto },
  subtitulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.textoSecundario },
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 16, marginBottom: 16 },
  secao: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  linha: { gap: 2 },
  rotulo: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario },
  valor: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.texto, lineHeight: 22 },
  valorDestaque: { fontFamily: fontes.titulo, fontSize: 20, color: cores.sucesso },
  detalhe: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 18 },
  carregando: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario },
});

import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { Formulario } from "../api/formulario";
import { useAuth } from "../auth/AuthContext";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import { aindaEmEspera, aparenciaDo, formatarDataHora } from "../formulario/aparencia";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { formatarDataBr } from "../validation/campos";

type Props = NativeStackScreenProps<RootStackParamList, "ResultadoFormulario">;

const MS_POR_DIA = 86_400_000;

// RN-003 e RN-005: o que vale depois da resposta. Quem passou pode agendar até o fim da validade;
// quem não passou espera para responder de novo.
function prazoDoFormulario(formulario: Formulario, emEspera: boolean): { icone: "calendar-outline" | "hourglass-outline"; texto: string } {
  if (formulario.aprovado) {
    return {
      icone: "calendar-outline",
      texto: `Você pode agendar até ${formatarDataBr(formulario.validoAte)}. Antes de cada agendamento, o app confere se você passou e se o resultado ainda vale.`,
    };
  }
  if (emEspera && formulario.podeResponderEm) {
    const dias = Math.round((new Date(formulario.podeResponderEm).getTime() - new Date(formulario.preenchidoEm).getTime()) / MS_POR_DIA);
    return {
      icone: "hourglass-outline",
      texto: `Você poderá responder ao formulário de novo em ${formatarDataHora(formulario.podeResponderEm)} (${dias} dias depois desta resposta). Para agendar, é preciso passar no formulário.`,
    };
  }
  return { icone: "hourglass-outline", texto: "Você já pode responder ao formulário de novo. Para agendar, é preciso passar no formulário." };
}

// HU-03: o resultado do formulário (cenários 1 e 2): passou ou não passou, e o que isso muda.
export function ResultadoFormularioScreen({ navigation }: Props) {
  const { formulario } = useAuth();

  if (!formulario) {
    return (
      <Tela centralizar>
        <ActivityIndicator size="large" color={cores.primaria} />
      </Tela>
    );
  }

  const visual = aparenciaDo(formulario);
  const emEspera = aindaEmEspera(formulario);
  const temporarioComData = !formulario.vencido && formulario.resultado === "INAPTO_TEMPORARIO" && formulario.liberadoEm;
  const prazo = formulario.vencido ? null : prazoDoFormulario(formulario, emEspera);
  const respondidoEm = `Respondido em ${formatarDataHora(formulario.preenchidoEm)}.`;

  return (
    <Tela>
      <View style={[estilos.cartao, { backgroundColor: visual.fundo, borderColor: visual.cor }]} accessibilityRole="summary">
        <Ionicons name={visual.icone} size={40} color={visual.cor} />
        <Text style={[estilos.titulo, { color: visual.cor }]}>{visual.titulo}</Text>
        <Text style={estilos.mensagem}>{formulario.vencido ? formulario.bloqueioAgendamento : formulario.mensagem}</Text>
        {temporarioComData && (
          <Text style={[estilos.data, { color: visual.cor }]}>A partir de {formatarDataBr(formulario.liberadoEm!)}</Text>
        )}
      </View>

      {prazo && (
        <View style={estilos.prazo}>
          <Ionicons name={prazo.icone} size={22} color={cores.primaria} />
          <Text style={estilos.prazoTexto}>{prazo.texto}</Text>
        </View>
      )}

      {!formulario.vencido && formulario.motivos.length > 0 && (
        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>{formulario.resultado === "AVALIACAO" ? "A triagem vai avaliar" : "Motivos"}</Text>
          {formulario.motivos.map((motivo) => (
            <View key={motivo.codigo} style={estilos.item}>
              <Text style={estilos.marcador}>•</Text>
              <Text style={estilos.itemTexto}>{motivo.mensagem}</Text>
            </View>
          ))}
        </View>
      )}

      {!formulario.vencido && formulario.avisos.length > 0 && (
        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Importante</Text>
          {formulario.avisos.map((aviso) => (
            <View key={aviso} style={estilos.item}>
              <Text style={estilos.marcador}>•</Text>
              <Text style={estilos.itemTexto}>{aviso}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={estilos.validade}>
        {formulario.vencido
          ? `${respondidoEm} Valeu até ${formatarDataBr(formulario.validoAte)}.`
          : formulario.aprovado
            ? `${respondidoEm} Vale até ${formatarDataBr(formulario.validoAte)}. Se algo mudar antes da doação (doença, remédio, vacina, tatuagem), responda de novo.`
            : respondidoEm}
      </Text>

      <View style={estilos.botoes}>
        <Botao titulo="Voltar ao início" variante={formulario.vencido ? "secundario" : "primario"} aoPressionar={() => navigation.popToTop()} />
        <Botao
          titulo="Responder de novo"
          variante={formulario.vencido ? "primario" : "secundario"}
          desabilitado={emEspera}
          aoPressionar={() => navigation.navigate("Formulario")}
        />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  cartao: { borderRadius: raio, borderWidth: 1.5, padding: 20, gap: 8, alignItems: "flex-start", marginBottom: 16 },
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo },
  mensagem: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.texto, lineHeight: 23 },
  data: { fontFamily: fontes.titulo, fontSize: 18, marginTop: 4 },
  prazo: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 14, marginBottom: 20 },
  prazoTexto: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.texto, lineHeight: 20 },
  secao: { marginBottom: 20, gap: 8 },
  secaoTitulo: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  item: { flexDirection: "row", gap: 8 },
  marcador: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.primaria, lineHeight: 22 },
  itemTexto: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario + 1, color: cores.texto, lineHeight: 22 },
  validade: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 19, marginBottom: 24 },
  botoes: { gap: 12 },
});

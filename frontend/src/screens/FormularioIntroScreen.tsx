import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Formulario } from "../api/formulario";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import { aindaEmEspera } from "../formulario/aparencia";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { formatarDataBr } from "../validation/campos";

type Props = NativeStackScreenProps<RootStackParamList, "FormularioIntro">;

type Regras = { validadeDias: number; esperaDias: number };

// O que dizer a quem já respondeu antes (o novo resultado substitui o anterior).
function notaDoFormulario(formulario: Formulario): string {
  if (formulario.vencido) return "O seu último formulário venceu. Responder de novo substitui o anterior.";
  if (formulario.aprovado) {
    return `Você já passou no formulário e ele vale até ${formatarDataBr(formulario.validoAte)}. Se responder de novo, o novo resultado substitui o anterior.`;
  }
  return "Você já pode responder ao formulário de novo. O novo resultado substitui o anterior.";
}

// HU-03: o que é o formulário, antes de começar. Aparece logo depois do cadastro (HU-01, cenário 1).
export function FormularioIntroScreen({ navigation }: Props) {
  const { aviso, limparAviso, formulario, carregarFormulario, buscarModeloDoFormulario } = useAuth();
  const [regras, setRegras] = useState<Regras | null>(null);

  // Os números (dias de validade e de espera) vêm da API, para o texto nunca ficar diferente da regra.
  useEffect(() => {
    let ativo = true;
    buscarModeloDoFormulario()
      .then((modelo) => {
        if (ativo) setRegras({ validadeDias: modelo.validadeDias, esperaDias: modelo.esperaDias });
      })
      .catch(() => {
        // sem conexão: o quadro das regras só não aparece
      });
    return () => {
      ativo = false;
    };
  }, [buscarModeloDoFormulario]);

  // Quem chega aqui vê a espera de agora, não a de uma hora atrás.
  useFocusEffect(
    useCallback(() => {
      void carregarFormulario();
    }, [carregarFormulario]),
  );

  const emEspera = formulario ? aindaEmEspera(formulario) : false;

  return (
    <Tela>
      <Text style={estilos.titulo}>Formulário de elegibilidade</Text>
      <Text style={estilos.subtitulo}>Vamos conferir se você já pode doar sangue.</Text>

      {aviso && <Aviso tipo={aviso.tipo} texto={aviso.texto} aoFechar={limparAviso} />}
      {formulario && emEspera && <Aviso tipo="erro" texto={formulario.bloqueioAgendamento ?? "Aguarde para responder ao formulário de novo."} />}

      <View style={estilos.cartao}>
        <Ionicons name="information-circle-outline" size={26} color={cores.primaria} />
        <Text style={estilos.cartaoTitulo}>Como funciona</Text>
        <Linha texto="São perguntas rápidas sobre a sua saúde e os últimos meses. Leva alguns minutos." />
        <Linha texto="É uma pré-análise: a decisão final é sempre da triagem presencial no hemocentro, feita por um profissional de saúde." />
        <Linha texto="No fim, você vê se passou. Se passou, já pode agendar. Se não passou, vê o motivo e, quando houver, a partir de que dia pode doar." />
        <Linha texto="Responda com sinceridade: isso protege você e quem vai receber o sangue." />
      </View>

      {regras && (
        <View style={estilos.cartao}>
          <Ionicons name="calendar-outline" size={26} color={cores.primaria} />
          <Text style={estilos.cartaoTitulo}>Depois da sua resposta</Text>
          <Linha
            texto={`Se você passar, o resultado vale por ${regras.validadeDias} dias. Antes de cada agendamento, o app confere se você passou e se o resultado ainda vale.`}
          />
          <Linha texto={`Se você não passar, precisa esperar ${regras.esperaDias} dias para responder ao formulário de novo.`} />
        </View>
      )}

      <View style={estilos.cartao}>
        <Ionicons name="lock-closed-outline" size={26} color={cores.primaria} />
        <Text style={estilos.cartaoTitulo}>Sua privacidade</Text>
        <Linha texto="As respostas são confidenciais: só você as vê no app." />
        <Linha texto="Guardamos só o necessário para calcular o seu resultado e apagamos tudo se você excluir a conta." />
      </View>

      {formulario && !emEspera && <Text style={estilos.nota}>{notaDoFormulario(formulario)}</Text>}

      <Botao titulo={formulario ? "Responder de novo" : "Começar"} desabilitado={emEspera} aoPressionar={() => navigation.navigate("Formulario")} />
    </Tela>
  );
}

const Linha = ({ texto }: { texto: string }) => (
  <View style={estilos.linha}>
    <Text style={estilos.marcador}>•</Text>
    <Text style={estilos.linhaTexto}>{texto}</Text>
  </View>
);

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo + 2, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 20 },
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 8, marginBottom: 16 },
  cartaoTitulo: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  linha: { flexDirection: "row", gap: 8 },
  marcador: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.primaria, lineHeight: 20 },
  linhaTexto: { flex: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
  nota: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, marginBottom: 16, lineHeight: 19 },
});

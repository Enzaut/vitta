import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Agendamento } from "../api/agenda";
import { Botao } from "../components/Botao";
import { EtiquetaDemonstracao } from "../mapa/Demonstracao";
import { cores, fontes, raio, tamanhos } from "../theme";
import { dataPorExtenso } from "./formatacao";

type Props = {
  agendamento: Agendamento;
  // Se informado, mostra o botão "Cancelar agendamento" (com a confirmação da HU-06, cenário 3).
  aoCancelar?: () => void;
  cancelando?: boolean;
};

// A doação agendada: quando, onde e com quem. Usado na aba Agendar e na tela inicial.
export function CartaoDoAgendamento({ agendamento, aoCancelar, cancelando = false }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const { instituicao, medico } = agendamento;

  return (
    <View style={estilos.cartao}>
      <View style={estilos.topo}>
        <View style={estilos.tag}>
          <Text style={estilos.tagTexto}>Agendado</Text>
        </View>
        {instituicao.demonstracao && <EtiquetaDemonstracao />}
      </View>

      <Text style={estilos.data}>{dataPorExtenso(agendamento.data)}</Text>
      <Text style={estilos.hora}>
        {agendamento.hora} às {agendamento.horaFim}
      </Text>

      <Linha icone="business-outline" texto={instituicao.nome} detalhe={`${instituicao.endereco}`} />
      <Linha icone="medkit-outline" texto={medico.nome} detalhe={medico.especialidade} />
      <Linha icone="water-outline" texto={`Tipo sanguíneo ${agendamento.tipoSanguineo}`} detalhe={`Protocolo ${agendamento.protocolo}`} />

      {aoCancelar && !confirmando && (
        <Botao titulo="Cancelar agendamento" variante="secundario" aoPressionar={() => setConfirmando(true)} />
      )}

      {aoCancelar && confirmando && (
        <View style={estilos.confirmacao} accessibilityRole="alert">
          <Text style={estilos.confirmacaoTexto}>Tem certeza que deseja cancelar este agendamento?</Text>
          <Botao titulo="Confirmar cancelamento" variante="perigo" carregando={cancelando} aoPressionar={aoCancelar} />
          <Botao titulo="Voltar" variante="secundario" desabilitado={cancelando} aoPressionar={() => setConfirmando(false)} />
        </View>
      )}
    </View>
  );
}

function Linha({ icone, texto, detalhe }: { icone: keyof typeof Ionicons.glyphMap; texto: string; detalhe: string }) {
  return (
    <View style={estilos.linha}>
      <Ionicons name={icone} size={22} color={cores.primaria} />
      <View style={estilos.linhaTextos}>
        <Text style={estilos.linhaTexto}>{texto}</Text>
        <Text style={estilos.linhaDetalhe}>{detalhe}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 12 },
  topo: { flexDirection: "row", alignItems: "center", gap: 10 },
  // Etiqueta azul de "agendado", como na Especificação Funcional de Telas.
  tag: { alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "#E6EFFC" },
  tagTexto: { fontFamily: fontes.botao, fontSize: 12, color: "#1F5FBF" },
  data: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  hora: { fontFamily: fontes.subtitulo, fontSize: tamanhos.texto + 2, color: cores.primaria, marginTop: -6 },
  linha: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  linhaTextos: { flex: 1, gap: 2 },
  linhaTexto: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.texto, lineHeight: 22 },
  linhaDetalhe: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 18 },
  confirmacao: { gap: 12, padding: 14, borderRadius: raio, backgroundColor: cores.fundoErro, borderWidth: 1, borderColor: cores.erro },
  confirmacaoTexto: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.primariaEscura, lineHeight: 22 },
});

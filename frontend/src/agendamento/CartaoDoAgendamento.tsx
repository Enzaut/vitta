import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Agendamento, StatusAgendamento } from "../api/agenda";
import { Botao } from "../components/Botao";
import { formatarDataHora } from "../formulario/aparencia";
import { EtiquetaDemonstracao } from "../mapa/Demonstracao";
import { cores, fontes, raio, tamanhos } from "../theme";
import { dataPorExtenso } from "./formatacao";

type Props = {
  agendamento: Agendamento;
  // Mostra "Cancelar agendamento", com a pergunta de confirmação da HU-06 (cenário 3). Só para agendamento por vir.
  aoCancelar?: () => void;
  // Só na demonstração: mostra o botão que faz o papel da instituição confirmando a doação (RN-007).
  aoSimularDoacao?: () => void;
  // Só para doação confirmada (Finalizado): abre os detalhes (HU-06, cenário 4).
  aoVerDetalhes?: () => void;
  // Uma ação (cancelar ou simular) está em andamento.
  ocupado?: boolean;
  // Uma observação embaixo do cartão (ex.: "Este horário já passou").
  nota?: string;
};

// Etiquetas de status da Especificação Funcional de Telas: azul para agendado, verde para finalizado.
const ETIQUETA: Record<StatusAgendamento, { texto: string; cor: string; fundo: string }> = {
  AGENDADO: { texto: "Agendado", cor: "#1F5FBF", fundo: "#E6EFFC" },
  FINALIZADO: { texto: "Finalizado", cor: "#1F6B41", fundo: "#E8F5EE" },
  CANCELADO: { texto: "Cancelado", cor: "#5F5F5F", fundo: "#E8E8E8" },
};

// Um agendamento de doação: quando, onde e com quem. Usado na aba Agendar e no histórico.
export function CartaoDoAgendamento({ agendamento, aoCancelar, aoSimularDoacao, aoVerDetalhes, ocupado = false, nota }: Props) {
  const [acao, setAcao] = useState<"cancelar" | "simular" | null>(null);
  const { instituicao, medico } = agendamento;
  const etiqueta = ETIQUETA[agendamento.status];
  const podeSimular = !!aoSimularDoacao && agendamento.status === "AGENDADO" && agendamento.simulado;

  return (
    <View style={estilos.cartao}>
      <View style={estilos.topo}>
        <View style={[estilos.tag, { backgroundColor: etiqueta.fundo }]}>
          <Text style={[estilos.tagTexto, { color: etiqueta.cor }]}>{etiqueta.texto}</Text>
        </View>
        {instituicao.demonstracao && <EtiquetaDemonstracao />}
      </View>

      <Text style={estilos.data}>{dataPorExtenso(agendamento.data)}</Text>
      <Text style={estilos.hora}>
        {agendamento.hora} às {agendamento.horaFim}
      </Text>
      {agendamento.status === "FINALIZADO" && agendamento.pontosGanhos !== null && (
        <Text style={estilos.pontos}>+{agendamento.pontosGanhos} pontos</Text>
      )}

      <Linha icone="business-outline" texto={instituicao.nome} detalhe={instituicao.endereco} />
      <Linha icone="medkit-outline" texto={medico.nome} detalhe={medico.especialidade} />
      <Linha icone="water-outline" texto={`Tipo sanguíneo ${agendamento.tipoSanguineo}`} detalhe={`Protocolo ${agendamento.protocolo}`} />

      {agendamento.status === "CANCELADO" && agendamento.canceladoEm && (
        <Text style={estilos.nota}>Cancelado em {formatarDataHora(agendamento.canceladoEm)}.</Text>
      )}
      {agendamento.status === "FINALIZADO" && agendamento.finalizadoEm && (
        <Text style={estilos.nota}>Doação confirmada em {formatarDataHora(agendamento.finalizadoEm)}.</Text>
      )}
      {!!nota && <Text style={estilos.nota}>{nota}</Text>}

      {agendamento.status === "AGENDADO" && acao === null && (
        <>
          {aoCancelar && <Botao titulo="Cancelar agendamento" variante="secundario" aoPressionar={() => setAcao("cancelar")} />}
          {podeSimular && <Botao titulo="Simular doação (demonstração)" variante="secundario" aoPressionar={() => setAcao("simular")} />}
        </>
      )}

      {acao === "cancelar" && aoCancelar && (
        <View style={[estilos.confirmacao, estilos.confirmacaoCancelar]} accessibilityRole="alert">
          <Text style={estilos.confirmacaoTextoCancelar}>Tem certeza que deseja cancelar este agendamento?</Text>
          <Botao titulo="Confirmar cancelamento" variante="perigo" carregando={ocupado} aoPressionar={aoCancelar} />
          <Botao titulo="Voltar" variante="secundario" desabilitado={ocupado} aoPressionar={() => setAcao(null)} />
        </View>
      )}

      {acao === "simular" && aoSimularDoacao && (
        <View style={[estilos.confirmacao, estilos.confirmacaoSimular]} accessibilityRole="alert">
          <Text style={estilos.confirmacaoTextoSimular}>
            Isto finge que a instituição confirmou a sua doação, só para você testar os pontos e a patente. Só existe na demonstração.
          </Text>
          <Botao titulo="Confirmar doação" carregando={ocupado} aoPressionar={aoSimularDoacao} />
          <Botao titulo="Voltar" variante="secundario" desabilitado={ocupado} aoPressionar={() => setAcao(null)} />
        </View>
      )}

      {agendamento.status === "FINALIZADO" && aoVerDetalhes && <Botao titulo="Ver detalhes" variante="secundario" aoPressionar={aoVerDetalhes} />}
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
  tag: { alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 },
  tagTexto: { fontFamily: fontes.botao, fontSize: 12 },
  data: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  hora: { fontFamily: fontes.subtitulo, fontSize: tamanhos.texto + 2, color: cores.primaria, marginTop: -6 },
  pontos: { fontFamily: fontes.titulo, fontSize: 18, color: cores.sucesso },
  linha: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  linhaTextos: { flex: 1, gap: 2 },
  linhaTexto: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.texto, lineHeight: 22 },
  linhaDetalhe: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 18 },
  nota: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 19 },
  confirmacao: { gap: 12, padding: 14, borderRadius: raio, borderWidth: 1 },
  confirmacaoCancelar: { backgroundColor: cores.fundoErro, borderColor: cores.erro },
  confirmacaoTextoCancelar: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.primariaEscura, lineHeight: 22 },
  confirmacaoSimular: { backgroundColor: "#FFF6DD", borderColor: "#9A7400" },
  confirmacaoTextoSimular: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: "#5C4300", lineHeight: 22 },
});

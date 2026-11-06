import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Agenda } from "../api/agenda";
import { cores, fontes, raio, tamanhos } from "../theme";
import { dataPorExtenso, diaDaSemanaCurto, mesCurto, numeroDoDia, rotuloDeLivres } from "./formatacao";

export type Selecao = { medicoCodigo: string; inicio: string };

type Props = {
  agenda: Agenda;
  // O dia aberto (AAAA-MM-DD).
  dia: string | null;
  aoMudarDia: (data: string) => void;
  selecao: Selecao | null;
  aoSelecionar: (selecao: Selecao | null) => void;
  erro?: string;
};

// Campo "Data e hora" do formulário de agendamento (HU-04): primeiro o dia, depois os médicos daquele dia
// com os horários livres (podem ser escolhidos) e ocupados (só aparecem, apagados).
export function EscolhaDeHorario({ agenda, dia, aoMudarDia, selecao, aoSelecionar, erro }: Props) {
  const diaAberto = agenda.dias.find((d) => d.data === dia) ?? null;

  if (agenda.dias.length === 0) {
    return (
      <View style={estilos.grupo}>
        <Text style={estilos.rotulo}>Data e hora</Text>
        <Text style={estilos.vazio}>Esta instituição não tem horários nos próximos dias. Escolha outra instituição.</Text>
      </View>
    );
  }

  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>Data e hora</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.dias} accessibilityLabel="Dias com horários">
        {agenda.dias.map((d) => {
          const aberto = d.data === dia;
          const lotado = d.livres === 0;
          return (
            <Pressable
              key={d.data}
              onPress={() => aoMudarDia(d.data)}
              accessibilityRole="button"
              accessibilityLabel={`${dataPorExtenso(d.data)}, ${lotado ? "sem horários livres" : rotuloDeLivres(d.livres)}`}
              accessibilityState={{ selected: aberto }}
              style={[estilos.dia, lotado && estilos.diaLotado, aberto && estilos.diaAberto, !!erro && !aberto && estilos.diaComErro]}
            >
              <Text style={[estilos.diaSemana, aberto && estilos.textoClaro]}>{diaDaSemanaCurto(d.data).toUpperCase()}</Text>
              <Text style={[estilos.diaNumero, aberto && estilos.textoClaro]}>{numeroDoDia(d.data)}</Text>
              <Text style={[estilos.diaMes, aberto && estilos.textoClaro]}>{mesCurto(d.data)}</Text>
              <Text style={[estilos.diaLivres, lotado && estilos.diaLivresLotado, aberto && estilos.textoClaro]}>{lotado ? "lotado" : rotuloDeLivres(d.livres)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {diaAberto && (
        <View style={[estilos.horarios, !!erro && estilos.horariosComErro]}>
          <Text style={estilos.diaTitulo}>{dataPorExtenso(diaAberto.data)}</Text>

          <View style={estilos.legenda} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Legenda estilo={estilos.legendaLivre} texto="livre" />
            <Legenda estilo={estilos.legendaOcupado} texto="ocupado" />
            <Legenda estilo={estilos.legendaEscolhido} texto="escolhido" />
          </View>

          {diaAberto.livres === 0 && <Text style={estilos.lotadoAviso}>Todos os horários deste dia estão ocupados. Escolha outro dia.</Text>}

          {diaAberto.medicos.map((medico) => {
            const livres = medico.horarios.filter((h) => h.status === "LIVRE").length;
            return (
              <View key={medico.codigo} style={estilos.medico}>
                <View style={estilos.medicoCabecalho}>
                  <Ionicons name="medkit-outline" size={20} color={cores.primaria} />
                  <View style={estilos.medicoTextos}>
                    <Text style={estilos.medicoNome}>{medico.nome}</Text>
                    <Text style={estilos.medicoEspecialidade}>
                      {medico.especialidade} · {livres === 0 ? "sem horários livres" : `${rotuloDeLivres(livres)} de ${medico.horarios.length}`}
                    </Text>
                  </View>
                </View>

                <View style={estilos.grade}>
                  {medico.horarios.map((horario) => {
                    const ocupado = horario.status === "OCUPADO";
                    const escolhido = selecao?.medicoCodigo === medico.codigo && selecao.inicio === horario.inicio;
                    return (
                      <Pressable
                        key={horario.inicio}
                        disabled={ocupado}
                        onPress={() => aoSelecionar(escolhido ? null : { medicoCodigo: medico.codigo, inicio: horario.inicio })}
                        accessibilityRole="button"
                        accessibilityLabel={`${horario.hora}, ${ocupado ? "ocupado" : "livre"}, ${medico.nome}`}
                        accessibilityState={{ disabled: ocupado, selected: escolhido }}
                        style={[estilos.hora, ocupado && estilos.horaOcupada, escolhido && estilos.horaEscolhida]}
                      >
                        <Text style={[estilos.horaTexto, ocupado && estilos.horaTextoOcupada, escolhido && estilos.textoClaro]}>{horario.hora}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {!!erro && (
        <Text style={estilos.erro} accessibilityRole="alert">
          {erro}
        </Text>
      )}
    </View>
  );
}

function Legenda({ estilo, texto }: { estilo: object; texto: string }) {
  return (
    <View style={estilos.legendaItem}>
      <View style={[estilos.legendaCor, estilo]} />
      <Text style={estilos.legendaTexto}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { marginBottom: 24 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.texto, marginBottom: 8 },
  vazio: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
  dias: { gap: 10, paddingVertical: 4 },
  dia: {
    width: 76,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: raio,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  diaLotado: { backgroundColor: cores.fundoSecundario },
  diaAberto: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  diaComErro: { borderColor: cores.erro },
  diaSemana: { fontFamily: fontes.textoMedio, fontSize: 12, color: cores.textoSecundario, letterSpacing: 0.5 },
  diaNumero: { fontFamily: fontes.titulo, fontSize: 24, color: cores.texto, lineHeight: 32 },
  diaMes: { fontFamily: fontes.texto, fontSize: 12, color: cores.textoSecundario },
  diaLivres: { fontFamily: fontes.textoMedio, fontSize: 12, color: cores.sucesso, marginTop: 4 },
  diaLivresLotado: { color: cores.textoSecundario },
  textoClaro: { color: "#FFFFFF" },
  horarios: { marginTop: 12, padding: 14, gap: 14, borderRadius: raio, backgroundColor: cores.fundoSecundario, borderWidth: 1.5, borderColor: cores.fundoSecundario },
  horariosComErro: { borderColor: cores.erro, backgroundColor: cores.fundoErro },
  diaTitulo: { fontFamily: fontes.subtitulo, fontSize: 16, color: cores.texto },
  legenda: { flexDirection: "row", gap: 16 },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendaCor: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5 },
  legendaLivre: { backgroundColor: cores.fundo, borderColor: cores.primaria },
  legendaOcupado: { backgroundColor: "#E3E3E3", borderColor: "#E3E3E3" },
  legendaEscolhido: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  legendaTexto: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario },
  lotadoAviso: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
  medico: { gap: 10, padding: 12, borderRadius: raio, backgroundColor: cores.fundo },
  medicoCabecalho: { flexDirection: "row", alignItems: "center", gap: 10 },
  medicoTextos: { flex: 1 },
  medicoNome: { fontFamily: fontes.subtitulo, fontSize: tamanhos.texto, color: cores.texto },
  medicoEspecialidade: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hora: {
    minWidth: 68,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    backgroundColor: cores.fundo,
  },
  horaOcupada: { backgroundColor: "#E3E3E3", borderColor: "#E3E3E3" },
  horaEscolhida: { backgroundColor: cores.primaria },
  horaTexto: { fontFamily: fontes.botao, fontSize: 14, color: cores.primariaEscura },
  horaTextoOcupada: { color: "#8A8A8A", textDecorationLine: "line-through", fontFamily: fontes.texto },
  erro: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.erro, marginTop: 6 },
});

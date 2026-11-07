import { StyleSheet, Text, View } from "react-native";
import type { ResumoDeGamificacao } from "../api/gamificacao";
import { cores, fontes, tamanhos } from "../theme";
import { aparenciaDaPatente, doacoesPorExtenso, fracaoDoProgresso, textoDoProgresso } from "./aparencia";
import { EmblemaDaPatente } from "./EmblemaDaPatente";

// Pontos, patente e quanto falta para a próxima (RN-007 e RN-008).
export function ResumoDePontos({ resumo }: { resumo: ResumoDeGamificacao }) {
  const { cor } = aparenciaDaPatente(resumo.patente.nivel);
  const fracao = fracaoDoProgresso(resumo);

  return (
    <View style={estilos.bloco}>
      <View style={estilos.linha}>
        <View style={estilos.pontos} accessible accessibilityLabel={`${resumo.pontos} pontos`}>
          <Text style={estilos.numero}>{resumo.pontos}</Text>
          <Text style={estilos.rotulo}>pontos</Text>
        </View>
        <EmblemaDaPatente nivel={resumo.patente.nivel} nome={resumo.patente.nome} />
      </View>

      <View style={estilos.trilha} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(fracao * 100) }}>
        <View style={[estilos.progresso, { width: `${fracao * 100}%`, backgroundColor: cor }]} />
      </View>

      <Text style={estilos.texto}>{textoDoProgresso(resumo)}</Text>
      <Text style={estilos.dica}>
        {resumo.doacoes === 0 ? "Nenhuma doação confirmada ainda." : `${doacoesPorExtenso(resumo.doacoes)} ${resumo.doacoes === 1 ? "confirmada" : "confirmadas"}.`}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: 10 },
  linha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pontos: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  numero: { fontFamily: fontes.titulo, fontSize: 34, color: cores.texto, lineHeight: 42 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.textoSecundario },
  trilha: { height: 8, borderRadius: 4, backgroundColor: "#E3E3E3", overflow: "hidden" },
  progresso: { height: 8, borderRadius: 4 },
  texto: { fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.texto, lineHeight: 20 },
  dica: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario },
});

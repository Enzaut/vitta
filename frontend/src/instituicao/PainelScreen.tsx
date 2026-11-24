import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../api/client";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { LinhaDado } from "../components/LinhaDado";
import { Tela } from "../components/Tela";
import { falarTipo } from "../mapa/geografia";
import type { AbaInstituicaoProps } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { formatarDataBr } from "../validation/campos";
import { useInstituicao } from "./InstituicaoContext";

type Props = AbaInstituicaoProps<"Painel">;

// Tela inicial da instituição: como está o pedido de inclusão no mapa, o estoque e as campanhas.
export function PainelScreen({ navigation }: Props) {
  const { conta, aviso, limparAviso, painel, carregarPainel, campanhas, carregarCampanhas, simularDecisao } = useInstituicao();
  const [decidindo, setDecidindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // O pedido pode ter mudado de situação e as campanhas vencem com o tempo: confere de novo sempre que a tela aparece.
  useFocusEffect(
    useCallback(() => {
      void carregarPainel();
      void carregarCampanhas();
    }, [carregarPainel, carregarCampanhas]),
  );

  async function decidir(decisao: "APROVADA" | "RECUSADA") {
    setErro(null);
    setDecidindo(true);
    try {
      await simularDecisao(decisao, decisao === "RECUSADA" ? "Recusado na demonstração." : undefined);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível registrar a decisão. Tente novamente.");
    } finally {
      setDecidindo(false);
    }
  }

  const pedido = painel?.solicitacao ?? null;
  const instituicao = painel?.instituicao ?? null;
  const ativas = campanhas?.filter((c) => c.situacao === "ATIVA").length;

  return (
    <Tela>
      <Text style={estilos.titulo}>{conta?.nome}</Text>
      <Text style={estilos.subtitulo}>Painel da instituição</Text>

      {aviso && <Aviso tipo={aviso.tipo} texto={aviso.texto} aoFechar={limparAviso} />}
      {erro && <Aviso tipo="erro" texto={erro} aoFechar={() => setErro(null)} />}

      {/* Pedido de inclusão no mapa */}
      <View style={estilos.cartao}>
        <Ionicons name="map-outline" size={28} color={cores.primaria} />
        <Text style={estilos.cartaoTitulo}>Sua instituição no mapa</Text>

        {painel === undefined && (
          <>
            <ActivityIndicator color={cores.primaria} style={estilos.carregando} />
            <Text style={estilos.cartaoTexto}>Carregando…</Text>
            <Botao titulo="Tentar de novo" variante="secundario" aoPressionar={carregarPainel} />
          </>
        )}

        {painel && !pedido && !instituicao && (
          <>
            <Text style={estilos.cartaoTexto}>
              Os doadores só enxergam a sua instituição depois que ela entra no mapa. Informe o endereço e o horário de atendimento para pedir a inclusão.
            </Text>
            <Botao titulo="Pedir inclusão no mapa" aoPressionar={() => navigation.navigate("SolicitacaoInclusao")} />
          </>
        )}

        {pedido?.situacao === "PENDENTE" && (
          <>
            <View style={[estilos.situacao, { backgroundColor: cores.fundoSecundario }]}>
              <Ionicons name="time-outline" size={22} color={cores.alerta} />
              <Text style={[estilos.situacaoTexto, { color: cores.texto }]}>Pedido em análise</Text>
            </View>
            <Text style={estilos.cartaoTexto}>
              {pedido.nome}, {pedido.endereco}, {pedido.cidade} - {pedido.uf}. Enviado em {formatarDataBr(pedido.criadoEm.slice(0, 10))}.
            </Text>
            {painel?.aprovacaoSimulada && (
              <View style={estilos.demonstracao}>
                <Text style={estilos.demonstracaoTitulo}>Só na demonstração</Text>
                <Text style={estilos.dica}>
                  O VITTA ainda não tem um administrador para analisar o pedido. Use os botões abaixo para fazer o papel dele.
                </Text>
                <Botao titulo="Simular aprovação" aoPressionar={() => decidir("APROVADA")} carregando={decidindo} />
                <Botao titulo="Simular recusa" variante="secundario" aoPressionar={() => decidir("RECUSADA")} desabilitado={decidindo} />
              </View>
            )}
          </>
        )}

        {pedido?.situacao === "RECUSADA" && !instituicao && (
          <>
            <View style={[estilos.situacao, { backgroundColor: cores.fundoErro }]}>
              <Ionicons name="close-circle-outline" size={22} color={cores.erro} />
              <Text style={[estilos.situacaoTexto, { color: cores.erro }]}>Pedido recusado</Text>
            </View>
            {!!pedido.motivoRecusa && <Text style={estilos.cartaoTexto}>Motivo: {pedido.motivoRecusa}</Text>}
            <Botao titulo="Corrigir e pedir de novo" aoPressionar={() => navigation.navigate("SolicitacaoInclusao")} />
          </>
        )}

        {instituicao && (
          <>
            <View style={[estilos.situacao, { backgroundColor: cores.fundoSucesso }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color={cores.sucesso} />
              <Text style={[estilos.situacaoTexto, { color: cores.sucesso }]}>Sua instituição está no mapa</Text>
            </View>
            <LinhaDado rotulo="Endereço" valor={`${instituicao.endereco}, ${instituicao.cidade} - ${instituicao.uf}`} />
            <LinhaDado rotulo="Horário de atendimento" valor={instituicao.horario} />
            <LinhaDado rotulo="Telefone" valor={instituicao.telefone ?? "Não informado"} />
            <Botao titulo="Telefone e horário" variante="secundario" aoPressionar={() => navigation.navigate("DadosInstituicao")} />
          </>
        )}
      </View>

      {/* Estoque */}
      {instituicao && (
        <View style={estilos.cartao}>
          <Ionicons name="water-outline" size={28} color={cores.primaria} />
          <Text style={estilos.cartaoTitulo}>Estoque de sangue</Text>
          {instituicao.estoqueAtualizadoEm ? (
            <Text style={estilos.cartaoTexto}>
              {instituicao.tiposEmFalta.length > 0
                ? `Em falta: ${instituicao.tiposEmFalta.map(falarTipo).join(", ")}.`
                : "Nenhum tipo em falta."}{" "}
              Atualizado em {formatarDataBr(instituicao.estoqueAtualizadoEm.slice(0, 10))}.
            </Text>
          ) : (
            <Text style={estilos.cartaoTexto}>Você ainda não informou o estoque. Os doadores veem os tipos em falta nos cards do mapa.</Text>
          )}
          <Botao titulo="Atualizar estoque" aoPressionar={() => navigation.navigate("Estoque")} />
        </View>
      )}

      {/* Campanhas */}
      <View style={estilos.cartao}>
        <Ionicons name="megaphone-outline" size={28} color={cores.primaria} />
        <Text style={estilos.cartaoTitulo}>Campanhas relâmpago</Text>
        {instituicao ? (
          <>
            <Text style={estilos.cartaoTexto}>
              {ativas === undefined
                ? "Carregando…"
                : ativas === 0
                  ? "Nenhuma campanha ativa agora. Crie uma para chamar doadores."
                  : `${ativas} ${ativas === 1 ? "campanha ativa" : "campanhas ativas"} agora.`}
            </Text>
            <Botao titulo="Criar campanha" aoPressionar={() => navigation.navigate("CampanhaForm")} />
            <Botao titulo="Ver minhas campanhas" variante="secundario" aoPressionar={() => navigation.navigate("CampanhasDaInstituicao")} />
          </>
        ) : (
          <Text style={estilos.cartaoTexto}>As campanhas ficam disponíveis depois que o pedido de inclusão no mapa for aprovado.</Text>
        )}
      </View>
    </Tela>
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
  demonstracao: { gap: 10, borderRadius: raio, borderWidth: 1, borderColor: cores.alerta, padding: 14, backgroundColor: cores.fundo },
  demonstracaoTitulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.texto },
});

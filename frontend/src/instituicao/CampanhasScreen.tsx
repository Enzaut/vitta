import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { Campanha, SituacaoDaCampanha } from "../api/instituicao";
import { ApiError } from "../api/client";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import type { AbaInstituicaoProps } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { formatarDataBr } from "../validation/campos";
import { useInstituicao } from "./InstituicaoContext";

type Props = AbaInstituicaoProps<"CampanhasDaInstituicao">;

const ROTULO: Record<SituacaoDaCampanha, string> = { ATIVA: "Ativa", ENCERRADA: "Encerrada", VENCIDA: "Venceu" };
const COR: Record<SituacaoDaCampanha, string> = { ATIVA: cores.sucesso, ENCERRADA: cores.textoSecundario, VENCIDA: cores.alerta };

// As campanhas relâmpago da instituição: criar, editar, encerrar antes da data e excluir.
export function CampanhasScreen({ navigation }: Props) {
  const { painel, carregarPainel, campanhas, carregarCampanhas, encerrarCampanha, excluirCampanha } = useInstituicao();
  const [erro, setErro] = useState<string | null>(null);
  // Qual campanha está pedindo confirmação para excluir (o app não usa a caixa de diálogo do sistema, que não existe na web).
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void carregarPainel();
      void carregarCampanhas();
    }, [carregarPainel, carregarCampanhas]),
  );

  async function executar(id: string, acao: (id: string) => Promise<void>) {
    setErro(null);
    setOcupada(id);
    try {
      await acao(id);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível concluir. Tente novamente.");
    } finally {
      setOcupada(null);
      setConfirmandoExclusao(null);
    }
  }

  const aprovada = !!painel?.instituicao;

  return (
    <Tela>
      <Text style={estilos.titulo}>Campanhas</Text>
      <Text style={estilos.subtitulo}>Chame doadores quando o estoque estiver baixo.</Text>

      {erro && <Aviso tipo="erro" texto={erro} aoFechar={() => setErro(null)} />}

      {painel && !aprovada && (
        <Aviso tipo="erro" texto="As campanhas ficam disponíveis depois que o pedido de inclusão no mapa for aprovado." />
      )}

      {aprovada && <Botao titulo="Nova campanha" aoPressionar={() => navigation.navigate("CampanhaForm")} />}

      {aprovada && campanhas === undefined && <ActivityIndicator color={cores.primaria} style={estilos.carregando} />}

      {aprovada && campanhas?.length === 0 && (
        <Text style={estilos.vazio}>Você ainda não criou nenhuma campanha.</Text>
      )}

      {campanhas?.map((c) => (
        <CartaoDaCampanha
          key={c.id}
          campanha={c}
          ocupada={ocupada === c.id}
          confirmandoExclusao={confirmandoExclusao === c.id}
          aoEditar={() => navigation.navigate("CampanhaForm", { campanha: c })}
          aoEncerrar={() => executar(c.id, encerrarCampanha)}
          aoPedirExclusao={() => setConfirmandoExclusao(c.id)}
          aoCancelarExclusao={() => setConfirmandoExclusao(null)}
          aoExcluir={() => executar(c.id, excluirCampanha)}
        />
      ))}
    </Tela>
  );
}

type CartaoProps = {
  campanha: Campanha;
  ocupada: boolean;
  confirmandoExclusao: boolean;
  aoEditar: () => void;
  aoEncerrar: () => void;
  aoPedirExclusao: () => void;
  aoCancelarExclusao: () => void;
  aoExcluir: () => void;
};

function CartaoDaCampanha({ campanha, ocupada, confirmandoExclusao, aoEditar, aoEncerrar, aoPedirExclusao, aoCancelarExclusao, aoExcluir }: CartaoProps) {
  const cor = COR[campanha.situacao];
  const podeEditar = campanha.situacao !== "ENCERRADA";

  return (
    <View style={estilos.cartao}>
      <View style={estilos.topo}>
        <Text style={estilos.cartaoTitulo}>{campanha.titulo}</Text>
        <View style={[estilos.etiqueta, { borderColor: cor }]}>
          <Text style={[estilos.etiquetaTexto, { color: cor }]}>{ROTULO[campanha.situacao]}</Text>
        </View>
      </View>

      <Text style={estilos.texto}>{campanha.descricao}</Text>

      <View style={estilos.linha}>
        <Ionicons name="water-outline" size={18} color={cores.textoSecundario} />
        <Text style={estilos.texto}>
          {campanha.tiposSanguineos.length > 0 ? campanha.tiposSanguineos.join(", ") : "Todos os tipos"}
        </Text>
      </View>
      <View style={estilos.linha}>
        <Ionicons name="calendar-outline" size={18} color={cores.textoSecundario} />
        <Text style={estilos.texto}>Vale até {formatarDataBr(campanha.validaAte)}</Text>
      </View>

      {confirmandoExclusao ? (
        <View style={estilos.confirmacao}>
          <Text style={estilos.texto}>Excluir esta campanha? Isso não pode ser desfeito.</Text>
          <Botao titulo="Sim, excluir" variante="perigo" aoPressionar={aoExcluir} carregando={ocupada} />
          <Botao titulo="Cancelar" variante="secundario" aoPressionar={aoCancelarExclusao} desabilitado={ocupada} />
        </View>
      ) : (
        <View style={estilos.botoes}>
          {podeEditar && <Botao titulo="Editar" variante="secundario" aoPressionar={aoEditar} desabilitado={ocupada} />}
          {campanha.situacao === "ATIVA" && <Botao titulo="Encerrar agora" variante="secundario" aoPressionar={aoEncerrar} carregando={ocupada} />}
          <Botao titulo="Excluir" variante="secundario" aoPressionar={aoPedirExclusao} desabilitado={ocupada} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.titulo, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 24 },
  carregando: { marginTop: 24 },
  vazio: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 24, textAlign: "center" },
  cartao: { backgroundColor: cores.fundoSecundario, borderRadius: raio, padding: 20, gap: 10, marginTop: 16 },
  topo: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cartaoTitulo: { flex: 1, fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  etiqueta: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  etiquetaTexto: { fontFamily: fontes.textoMedio, fontSize: 12 },
  texto: { flexShrink: 1, fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
  linha: { flexDirection: "row", alignItems: "center", gap: 8 },
  botoes: { gap: 10, marginTop: 6 },
  confirmacao: { gap: 10, marginTop: 6 },
});

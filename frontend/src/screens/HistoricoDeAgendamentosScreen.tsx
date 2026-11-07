import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { Agendamento, StatusAgendamento } from "../api/agenda";
import { ApiError } from "../api/client";
import { CartaoDoAgendamento } from "../agendamento/CartaoDoAgendamento";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { Tela } from "../components/Tela";
import type { RootStackParamList } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "HistoricoDeAgendamentos">;
type Filtro = "TODOS" | StatusAgendamento;

const FILTROS: Array<{ id: Filtro; rotulo: string }> = [
  { id: "TODOS", rotulo: "Todos" },
  { id: "AGENDADO", rotulo: "Agendados" },
  { id: "FINALIZADO", rotulo: "Finalizados" },
  { id: "CANCELADO", rotulo: "Cancelados" },
];

const MSG_SEM_CONEXAO = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
const mensagemDoErro = (erro: unknown, padrao: string) => (erro instanceof ApiError ? (erro.status === 0 ? MSG_SEM_CONEXAO : erro.message) : padrao);

// HU-06: histórico de agendamentos, do mais recente para o mais antigo, com filtro por status.
// Agendado: dá para cancelar. Finalizado: dá para ver os detalhes (pontos e patente).
export function HistoricoDeAgendamentosScreen({ navigation }: Props) {
  const { listarAgendamentos, cancelarAgendamento, simularDoacao, carregarAgendamento } = useAuth();

  // Nulo = ainda carregando.
  const [lista, setLista] = useState<Agendamento[] | null>(null);
  const [erroDeCarga, setErroDeCarga] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLista(await listarAgendamentos());
      setErroDeCarga(null);
    } catch (e) {
      setErroDeCarga(mensagemDoErro(e, "Não foi possível carregar o histórico. Tente novamente."));
    }
  }, [listarAgendamentos]);

  // Sempre que a tela volta a aparecer, a lista é buscada de novo (um agendamento pode ter sido cancelado ou confirmado).
  useFocusEffect(
    useCallback(() => {
      void carregar();
      return () => {
        setSucesso(null);
        setErro(null);
      };
    }, [carregar]),
  );

  async function executar(agendamento: Agendamento, acao: () => Promise<string>, padrao: string) {
    setOcupadoId(agendamento.id);
    setSucesso(null);
    setErro(null);
    try {
      setSucesso(await acao());
      await carregar();
    } catch (e) {
      setErro(mensagemDoErro(e, padrao));
      void carregar();
      void carregarAgendamento();
    } finally {
      setOcupadoId(null);
    }
  }

  const cancelar = (a: Agendamento) => executar(a, () => cancelarAgendamento(a.id), "Não foi possível cancelar. Tente novamente.");
  const simular = (a: Agendamento) =>
    executar(a, async () => (await simularDoacao(a.id)).mensagem, "Não foi possível confirmar a doação. Tente novamente.");

  const contagem = (id: Filtro) => (lista ?? []).filter((a) => id === "TODOS" || a.status === id).length;
  const mostrados = (lista ?? []).filter((a) => filtro === "TODOS" || a.status === filtro);

  return (
    <Tela>
      <Text style={estilos.titulo}>Histórico de agendamentos</Text>
      <Text style={estilos.subtitulo}>Do mais recente para o mais antigo.</Text>

      {sucesso && <Aviso tipo="sucesso" texto={sucesso} aoFechar={() => setSucesso(null)} />}
      {erro && <Aviso tipo="erro" texto={erro} aoFechar={() => setErro(null)} />}

      {lista === null && erroDeCarga === null && (
        <View style={estilos.carregando}>
          <ActivityIndicator size="large" color={cores.primaria} />
          <Text style={estilos.carregandoTexto}>Carregando o histórico…</Text>
        </View>
      )}

      {erroDeCarga !== null && lista === null && (
        <View style={estilos.bloco}>
          <Aviso tipo="erro" texto={erroDeCarga} />
          <Botao titulo="Tentar de novo" aoPressionar={() => void carregar()} />
        </View>
      )}

      {lista !== null && (
        <>
          <View style={estilos.filtros} accessibilityRole="tablist">
            {FILTROS.map(({ id, rotulo }) => {
              const ativo = id === filtro;
              return (
                <Pressable
                  key={id}
                  onPress={() => setFiltro(id)}
                  accessibilityRole="tab"
                  accessibilityLabel={`${rotulo}, ${contagem(id)}`}
                  accessibilityState={{ selected: ativo }}
                  style={[estilos.filtro, ativo && estilos.filtroAtivo]}
                >
                  <Text style={[estilos.filtroTexto, ativo && estilos.filtroTextoAtivo]}>{rotulo}</Text>
                  <Text style={[estilos.filtroContagem, ativo && estilos.filtroTextoAtivo]}>{contagem(id)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={estilos.contador} accessibilityLiveRegion="polite">
            {mostrados.length === 1 ? "1 resultado" : `${mostrados.length} resultados`}
          </Text>

          {lista.length === 0 && (
            <View style={estilos.vazio}>
              <Text style={estilos.vazioTexto}>Você ainda não tem agendamentos. Agende a sua primeira doação e comece a salvar vidas!</Text>
              <Botao titulo="Agendar doação" aoPressionar={() => navigation.popTo("Abas", { screen: "Agendar" })} />
            </View>
          )}

          {lista.length > 0 && mostrados.length === 0 && <Text style={estilos.vazioTexto}>Nenhum agendamento nesta situação.</Text>}

          <View style={estilos.cartoes}>
            {mostrados.map((agendamento) => {
              const futuro = new Date(agendamento.inicio).getTime() > Date.now();
              const agendadoQueJaPassou = agendamento.status === "AGENDADO" && !futuro;
              return (
                <CartaoDoAgendamento
                  key={agendamento.id}
                  agendamento={agendamento}
                  aoCancelar={agendamento.status === "AGENDADO" && futuro ? () => void cancelar(agendamento) : undefined}
                  aoSimularDoacao={agendamento.status === "AGENDADO" ? () => void simular(agendamento) : undefined}
                  aoVerDetalhes={agendamento.status === "FINALIZADO" ? () => navigation.navigate("DetalhesDaDoacao", { agendamento }) : undefined}
                  ocupado={ocupadoId === agendamento.id}
                  nota={agendadoQueJaPassou ? "Este horário já passou. Aguardando a confirmação da instituição." : undefined}
                />
              );
            })}
          </View>
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo + 2, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 20 },
  carregando: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 20 },
  carregandoTexto: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario },
  bloco: { gap: 12 },
  filtros: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filtro: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: cores.borda, backgroundColor: cores.fundo },
  filtroAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  filtroTexto: { fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.texto },
  filtroContagem: { fontFamily: fontes.botao, fontSize: 13, color: cores.primaria },
  filtroTextoAtivo: { color: "#FFFFFF" },
  contador: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, marginTop: 12, marginBottom: 12 },
  cartoes: { gap: 16 },
  vazio: { gap: 16, padding: 20, borderRadius: raio, backgroundColor: cores.fundoSecundario },
  vazioTexto: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, lineHeight: 23 },
});

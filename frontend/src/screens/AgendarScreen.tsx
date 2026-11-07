import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { Agenda } from "../api/agenda";
import { ApiError } from "../api/client";
import type { VerificacaoDeAgendamento } from "../api/formulario";
import type { Instituicao } from "../api/instituicoes";
import { CartaoDoAgendamento } from "../agendamento/CartaoDoAgendamento";
import { EscolhaDeHorario, type Selecao } from "../agendamento/EscolhaDeHorario";
import { dataPorExtenso } from "../agendamento/formatacao";
import { SeletorDeInstituicao } from "../agendamento/SeletorDeInstituicao";
import { useAuth } from "../auth/AuthContext";
import { Aviso } from "../components/Aviso";
import { Botao } from "../components/Botao";
import { SeletorTipoSanguineo } from "../components/SeletorTipoSanguineo";
import { Tela } from "../components/Tela";
import type { AbaProps } from "../navigation/types";
import { cores, fontes, raio, tamanhos } from "../theme";
import { OBRIGATORIO } from "../validation/campos";

type Props = AbaProps<"Agendar">;

type Erros = { instituicao?: string; horario?: string; tipo?: string };
type Conferencia = { tipo: "erro"; mensagem: string } | { tipo: "ok"; verificacao: VerificacaoDeAgendamento };

const MSG_SEM_CONEXAO = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";

// O que a pessoa escolheu, em palavras (dia, hora e médico), a partir da agenda que está na tela.
function detalhesDaSelecao(agenda: Agenda, selecao: Selecao) {
  for (const dia of agenda.dias) {
    for (const medico of dia.medicos) {
      if (medico.codigo !== selecao.medicoCodigo) continue;
      const horario = medico.horarios.find((h) => h.inicio === selecao.inicio);
      if (horario) return { data: dia.data, hora: horario.hora, medico: medico.nome, especialidade: medico.especialidade };
    }
  }
  return null;
}

const slotLivre = (agenda: Agenda, selecao: Selecao) =>
  agenda.dias.some((d) =>
    d.medicos.some((m) => m.codigo === selecao.medicoCodigo && m.horarios.some((h) => h.inicio === selecao.inicio && h.status === "LIVRE")),
  );

// HU-04: formulário de agendamento (aba "Agendar"): instituição, data e hora (com o médico) e tipo sanguíneo.
// Antes de tudo a tela pergunta à API se a pessoa pode agendar (RN-004, cenário 2); a API confere de novo ao reservar.
export function AgendarScreen({ navigation, route }: Props) {
  const {
    doador,
    verificarAgendamento,
    proximoAgendamento,
    carregarAgendamento,
    listarInstituicoes,
    buscarAgenda,
    agendar,
    cancelarAgendamento,
    simularDoacao,
  } = useAuth();

  // Nulo = ainda conferindo (só na primeira vez; depois a conferência se atualiza sem piscar a tela).
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);
  const [instituicoes, setInstituicoes] = useState<Instituicao[] | null>(null);
  const [erroInstituicoes, setErroInstituicoes] = useState<string | null>(null);
  const [instituicaoId, setInstituicaoId] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [erroAgenda, setErroAgenda] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [tipo, setTipo] = useState<string | null>(doador?.tipoSanguineo ?? null);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [simulando, setSimulando] = useState(false);
  // Muda quando aparece uma mensagem de sucesso ou de erro, para a tela voltar ao topo.
  const [chaveRolagem, setChaveRolagem] = useState(0);

  // O tipo do perfil é o ponto de partida do campo (a pessoa confirma ou muda).
  useEffect(() => {
    setTipo(doador?.tipoSanguineo ?? null);
  }, [doador?.tipoSanguineo]);

  // RN-004: toda vez que a aba aparece, a API diz se a pessoa passou no formulário e se ele ainda vale.
  const conferir = useCallback(async () => {
    try {
      const verificacao = await verificarAgendamento();
      await carregarAgendamento();
      setConferencia({ tipo: "ok", verificacao });
    } catch (erro) {
      const mensagem = erro instanceof ApiError ? erro.message : "Não foi possível conferir o seu formulário. Tente novamente.";
      // Se já havia uma conferência boa, a tela continua como estava.
      setConferencia((anterior) => (anterior?.tipo === "ok" ? anterior : { tipo: "erro", mensagem }));
    }
  }, [verificarAgendamento, carregarAgendamento]);

  useFocusEffect(
    useCallback(() => {
      void conferir();
      return () => setSucesso(null);
    }, [conferir]),
  );

  const liberado = conferencia?.tipo === "ok" && conferencia.verificacao.liberado;
  // Quem já tem uma doação agendada vê o agendamento (um por vez); os outros veem o formulário.
  const mostrarFormulario = liberado && !proximoAgendamento;

  // A lista de instituições do campo "Instituição" (todas, por nome).
  const carregarInstituicoes = useCallback(async () => {
    try {
      setInstituicoes((await listarInstituicoes({})).instituicoes);
    } catch (erro) {
      setErroInstituicoes(erro instanceof ApiError ? erro.message : "Não foi possível carregar as instituições. Tente novamente.");
    }
  }, [listarInstituicoes]);

  useEffect(() => {
    if (mostrarFormulario && instituicoes === null && erroInstituicoes === null) void carregarInstituicoes();
  }, [mostrarFormulario, instituicoes, erroInstituicoes, carregarInstituicoes]);

  // HU-05, cenário 2: o botão "Agendar doação" da instituição chega aqui com o campo "Instituição" já preenchido.
  const instituicaoDaRota = route.params?.instituicaoId;
  useEffect(() => {
    if (!instituicaoDaRota) return;
    setInstituicaoId(instituicaoDaRota);
    setErros((atual) => ({ ...atual, instituicao: undefined }));
    navigation.setParams({ instituicaoId: undefined });
  }, [instituicaoDaRota, navigation]);

  // Os médicos e horários da instituição escolhida.
  const carregarAgenda = useCallback(
    async (id: string) => {
      setCarregandoAgenda(true);
      setErroAgenda(null);
      try {
        const nova = await buscarAgenda(id);
        setAgenda(nova);
        // Abre o primeiro dia que ainda tem horário livre (ou o primeiro, se estiver tudo lotado). Quem já tinha um dia aberto fica nele.
        setDia((atual) => (nova.dias.some((d) => d.data === atual) ? atual : (nova.dias.find((d) => d.livres > 0) ?? nova.dias[0])?.data ?? null));
        // O horário escolhido pode ter sido tomado por outra pessoa enquanto a tela estava aberta.
        setSelecao((atual) => (atual && slotLivre(nova, atual) ? atual : null));
      } catch (erro) {
        setAgenda(null);
        setErroAgenda(erro instanceof ApiError ? erro.message : "Não foi possível carregar os horários. Tente novamente.");
      } finally {
        setCarregandoAgenda(false);
      }
    },
    [buscarAgenda],
  );

  useEffect(() => {
    setSelecao(null);
    setAgenda(null);
    setDia(null);
    if (instituicaoId && mostrarFormulario) void carregarAgenda(instituicaoId);
  }, [instituicaoId, mostrarFormulario, carregarAgenda]);

  function irParaOTopo() {
    setChaveRolagem((k) => k + 1);
  }

  // O servidor recusou o pedido: mostra o motivo no lugar certo e põe a tela em dia.
  function tratarErro(erro: unknown) {
    irParaOTopo();
    if (!(erro instanceof ApiError)) {
      setErroGeral("Não foi possível agendar. Tente novamente.");
      return;
    }
    if (erro.status === 400 && erro.campos) {
      const novos: Erros = {
        instituicao: erro.campos.instituicaoId,
        horario: erro.campos.inicio ?? erro.campos.medicoCodigo,
        tipo: erro.campos.tipoSanguineo,
      };
      setErros(novos);
      if (!novos.instituicao && !novos.horario && !novos.tipo) setErroGeral(erro.message);
      // Um horário que a agenda não reconhece: a lista estava velha.
      if (novos.horario && instituicaoId) void carregarAgenda(instituicaoId);
      return;
    }
    setErroGeral(erro.status === 0 ? MSG_SEM_CONEXAO : erro.message);
    if (erro.status === 403) void conferir(); // deixou de poder agendar (ex.: o formulário venceu)
    if (erro.status === 409) {
      // Horário tomado por outra pessoa, ou a pessoa já tinha um agendamento em outro aparelho.
      setSelecao(null);
      if (instituicaoId) void carregarAgenda(instituicaoId);
      void carregarAgendamento();
    }
  }

  // HU-04, cenários 1 e 3.
  async function confirmar() {
    setErroGeral(null);
    setSucesso(null);

    const novos: Erros = {};
    if (!instituicaoId) novos.instituicao = OBRIGATORIO;
    if (!selecao) novos.horario = OBRIGATORIO;
    if (!tipo) novos.tipo = OBRIGATORIO;
    setErros(novos);
    if (!instituicaoId || !selecao || !tipo) return;

    setEnviando(true);
    try {
      const { mensagem } = await agendar({ instituicaoId, medicoCodigo: selecao.medicoCodigo, inicio: selecao.inicio, tipoSanguineo: tipo });
      setSucesso(mensagem);
      setSelecao(null);
      irParaOTopo();
    } catch (erro) {
      tratarErro(erro);
    } finally {
      setEnviando(false);
    }
  }

  // HU-06, cenário 3 (a confirmação "Tem certeza?" é do cartão).
  async function cancelar() {
    if (!proximoAgendamento) return;
    setErroGeral(null);
    setSucesso(null);
    setCancelando(true);
    try {
      setSucesso(await cancelarAgendamento(proximoAgendamento.id));
    } catch (erro) {
      setErroGeral(erro instanceof ApiError ? (erro.status === 0 ? MSG_SEM_CONEXAO : erro.message) : "Não foi possível cancelar. Tente novamente.");
      void carregarAgendamento();
    } finally {
      setCancelando(false);
      irParaOTopo();
    }
  }

  // RN-007 (só na demonstração): faz o papel da instituição confirmando a doação; a pessoa ganha pontos e pode subir de patente.
  async function simular() {
    if (!proximoAgendamento) return;
    setErroGeral(null);
    setSucesso(null);
    setSimulando(true);
    try {
      setSucesso((await simularDoacao(proximoAgendamento.id)).mensagem);
    } catch (erro) {
      setErroGeral(erro instanceof ApiError ? (erro.status === 0 ? MSG_SEM_CONEXAO : erro.message) : "Não foi possível confirmar a doação. Tente novamente.");
      void carregarAgendamento();
    } finally {
      setSimulando(false);
      irParaOTopo();
    }
  }

  const detalhes = agenda && selecao ? detalhesDaSelecao(agenda, selecao) : null;
  const instituicaoEscolhida = instituicoes?.find((i) => i.id === instituicaoId) ?? null;

  return (
    <Tela chaveRolagem={chaveRolagem}>
      <Text style={estilos.titulo}>Agendar doação</Text>
      <Text style={estilos.subtitulo}>Escolha a instituição, o dia, o médico e o horário.</Text>
      <View style={estilos.atalho}>
        <Botao titulo="Histórico de agendamentos" variante="secundario" aoPressionar={() => navigation.navigate("HistoricoDeAgendamentos")} />
      </View>

      {sucesso && <Aviso tipo="sucesso" texto={sucesso} aoFechar={() => setSucesso(null)} />}
      {erroGeral && <Aviso tipo="erro" texto={erroGeral} aoFechar={() => setErroGeral(null)} />}

      {conferencia === null && (
        <View style={estilos.carregando}>
          <ActivityIndicator size="large" color={cores.primaria} />
          <Text style={estilos.carregandoTexto}>Conferindo o seu formulário…</Text>
        </View>
      )}

      {conferencia?.tipo === "erro" && (
        <View style={estilos.bloco}>
          <Aviso tipo="erro" texto={conferencia.mensagem} />
          <Botao titulo="Tentar de novo" aoPressionar={() => void conferir()} />
        </View>
      )}

      {/* HU-04, cenário 2: quem não pode agendar vê o motivo e um atalho para o formulário. */}
      {conferencia?.tipo === "ok" && !conferencia.verificacao.liberado && (
        <View style={estilos.bloqueio} accessibilityRole="alert">
          <Ionicons name="lock-closed" size={32} color={cores.primaria} />
          <Text style={estilos.bloqueioTitulo}>Agendamento bloqueado</Text>
          <Text style={estilos.bloqueioTexto}>{conferencia.verificacao.mensagem}</Text>
          {conferencia.verificacao.codigo === "NAO_APROVADO" ? (
            <Botao titulo="Ver resultado do formulário" aoPressionar={() => navigation.navigate("ResultadoFormulario")} />
          ) : (
            <Botao titulo="Responder ao formulário" aoPressionar={() => navigation.navigate("FormularioIntro")} />
          )}
        </View>
      )}

      {liberado && proximoAgendamento && (
        <View style={estilos.bloco}>
          <Text style={estilos.secao}>Sua doação agendada</Text>
          <CartaoDoAgendamento
            agendamento={proximoAgendamento}
            aoCancelar={() => void cancelar()}
            aoSimularDoacao={() => void simular()}
            ocupado={cancelando || simulando}
          />
          <Text style={estilos.nota}>Dá para ter uma doação agendada por vez. Para marcar outra, cancele esta antes.</Text>
        </View>
      )}

      {mostrarFormulario && (
        <>
          <View style={estilos.demonstracao} accessibilityRole="summary">
            <Ionicons name="information-circle" size={22} color="#9A7400" />
            <Text style={estilos.demonstracaoTexto}>
              Médicos e horários de demonstração. São fictícios e servem só para testar o aplicativo: nada é reservado de verdade.
            </Text>
          </View>

          <SeletorDeInstituicao
            instituicoes={instituicoes}
            erroDeCarga={erroInstituicoes}
            aoTentarDeNovo={() => setErroInstituicoes(null)}
            valorId={instituicaoId}
            aoMudar={(id) => {
              setInstituicaoId(id);
              // Outra instituição, outros horários: o aviso do horário da escolha anterior não vale mais.
              setErros((atual) => ({ ...atual, instituicao: undefined, horario: undefined }));
            }}
            erro={erros.instituicao}
          />

          {!instituicaoId && (
            <View style={estilos.grupo}>
              <Text style={estilos.rotulo}>Data e hora</Text>
              <Text style={[estilos.dica, !!erros.horario && estilos.dicaComErro]}>Escolha a instituição para ver os médicos e os horários.</Text>
              {!!erros.horario && <Text style={estilos.erro}>{erros.horario}</Text>}
            </View>
          )}

          {instituicaoId && carregandoAgenda && (
            <View style={estilos.carregando}>
              <ActivityIndicator color={cores.primaria} />
              <Text style={estilos.carregandoTexto}>Buscando médicos e horários…</Text>
            </View>
          )}

          {instituicaoId && !carregandoAgenda && erroAgenda && (
            <View style={estilos.bloco}>
              <Aviso tipo="erro" texto={erroAgenda} />
              <Botao titulo="Tentar de novo" variante="secundario" aoPressionar={() => void carregarAgenda(instituicaoId)} />
            </View>
          )}

          {instituicaoId && !carregandoAgenda && agenda && (
            <EscolhaDeHorario
              agenda={agenda}
              dia={dia}
              aoMudarDia={setDia}
              selecao={selecao}
              aoSelecionar={(nova) => {
                setSelecao(nova);
                setErros((atual) => ({ ...atual, horario: undefined }));
              }}
              erro={erros.horario}
            />
          )}

          {detalhes && (
            <View style={estilos.resumo} accessibilityRole="summary">
              <Text style={estilos.resumoTitulo}>Seu agendamento</Text>
              <Text style={estilos.resumoLinha}>{instituicaoEscolhida?.nome ?? agenda?.instituicao.nome}</Text>
              <Text style={estilos.resumoLinha}>
                {dataPorExtenso(detalhes.data)}, às {detalhes.hora}
              </Text>
              <Text style={estilos.resumoLinha}>
                {detalhes.medico} ({detalhes.especialidade})
              </Text>
            </View>
          )}

          <SeletorTipoSanguineo
            valor={tipo}
            aoMudar={(novo) => {
              setTipo(novo);
              setErros((atual) => ({ ...atual, tipo: undefined }));
            }}
            erro={erros.tipo}
          />
          <Text style={estilos.nota}>Confirme ou atualize o seu tipo sanguíneo. Se mudar, o seu perfil também muda.</Text>

          <Botao titulo="Confirmar agendamento" aoPressionar={() => void confirmar()} carregando={enviando} />
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.subtitulo + 2, color: cores.texto },
  subtitulo: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario, marginTop: 4, marginBottom: 16 },
  atalho: { marginBottom: 20 },
  carregando: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 20 },
  carregandoTexto: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.textoSecundario },
  bloco: { gap: 12, marginBottom: 8 },
  secao: { fontFamily: fontes.subtitulo, fontSize: 18, color: cores.texto },
  nota: { fontFamily: fontes.texto, fontSize: 13, color: cores.textoSecundario, lineHeight: 19, marginBottom: 16 },
  bloqueio: { alignItems: "flex-start", gap: 12, padding: 20, borderRadius: raio, backgroundColor: cores.fundoErro, borderWidth: 1, borderColor: cores.erro },
  bloqueioTitulo: { fontFamily: fontes.titulo, fontSize: 20, color: cores.primariaEscura },
  bloqueioTexto: { fontFamily: fontes.texto, fontSize: tamanhos.texto, color: cores.texto, lineHeight: 23, marginBottom: 4 },
  demonstracao: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: raio, backgroundColor: "#FFF6DD", borderWidth: 1, borderColor: "#9A7400", marginBottom: 20 },
  demonstracaoTexto: { flex: 1, fontFamily: fontes.texto, fontSize: 14, color: "#5C4300", lineHeight: 20 },
  grupo: { marginBottom: 24 },
  rotulo: { fontFamily: fontes.textoMedio, fontSize: tamanhos.textoSecundario, color: cores.texto, marginBottom: 8 },
  dica: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.textoSecundario, lineHeight: 20 },
  dicaComErro: { color: cores.erro },
  erro: { fontFamily: fontes.texto, fontSize: tamanhos.textoSecundario, color: cores.erro, marginTop: 6 },
  resumo: { gap: 4, padding: 16, borderRadius: raio, backgroundColor: cores.fundoSucesso, borderWidth: 1, borderColor: cores.sucesso, marginBottom: 24 },
  resumoTitulo: { fontFamily: fontes.subtitulo, fontSize: 16, color: "#1F6B41", marginBottom: 2 },
  resumoLinha: { fontFamily: fontes.textoMedio, fontSize: tamanhos.texto, color: cores.texto, lineHeight: 22 },
});

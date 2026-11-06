import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { apiAgenda, type Agenda, type Agendamento, type PedidoDeAgendamento, type RespostaDoAgendamento } from "../api/agenda";
import { api, type AlteracaoPerfil, type DadosCadastro, type Doador } from "../api/auth";
import { ApiError, configurarSessaoExpirada } from "../api/client";
import { apiFormulario, type Formulario, type Modelo, type Respostas, type VerificacaoDeAgendamento } from "../api/formulario";
import { apiInstituicoes, type FiltroInstituicoes, type ListaDeInstituicoes } from "../api/instituicoes";
import { apagarToken, lerToken, salvarToken } from "../storage/tokenStorage";
import { primeiroNome } from "../validation/campos";

// Mensagem de destaque que acompanha a pessoa entre telas (ex.: "conta excluída com sucesso").
export type AvisoGlobal = { tipo: "sucesso" | "erro"; texto: string };

type Contexto = {
  carregando: boolean;
  doador: Doador | null;
  aviso: AvisoGlobal | null;
  cadastrar(dados: DadosCadastro): Promise<void>;
  entrar(email: string, senha: string): Promise<void>;
  sair(): Promise<void>;
  atualizarPerfil(dados: AlteracaoPerfil): Promise<void>;
  excluirConta(): Promise<void>;
  limparAviso(): void;
  // HU-03: formulário de elegibilidade. undefined = ainda carregando (ou sem conexão); null = nunca respondeu.
  formulario: Formulario | null | undefined;
  // Logo depois do cadastro, o app leva a pessoa direto ao formulário (HU-01, cenário 1).
  irParaFormulario: boolean;
  concluirRedirecionamento(): void;
  carregarFormulario(): Promise<void>;
  buscarModeloDoFormulario(): Promise<Modelo>;
  enviarFormulario(respostas: Respostas): Promise<Formulario>;
  // RN-004: antes de marcar uma doação (HU-04), pergunta à API, a cada vez, se a pessoa passou no formulário e se ele ainda vale.
  verificarAgendamento(): Promise<VerificacaoDeAgendamento>;
  // HU-04: a doação agendada que ainda vai acontecer. undefined = ainda carregando (ou sem conexão); null = não tem.
  proximoAgendamento: Agendamento | null | undefined;
  carregarAgendamento(): Promise<void>;
  // Médicos e horários (livres e ocupados) de uma instituição.
  buscarAgenda(instituicaoId: string): Promise<Agenda>;
  // Reserva o horário. Quem confirma outro tipo sanguíneo também atualiza o perfil.
  agendar(pedido: PedidoDeAgendamento): Promise<RespostaDoAgendamento>;
  // Cancela o agendamento (HU-06, cenário 3) e devolve a mensagem de confirmação.
  cancelarAgendamento(id: string): Promise<string>;
  // HU-05: instituições de coleta (com a localização, só as que estão dentro do raio).
  listarInstituicoes(filtro: FiltroInstituicoes): Promise<ListaDeInstituicoes>;
};

const AuthContext = createContext<Contexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [doador, setDoador] = useState<Doador | null>(null);
  const [aviso, setAviso] = useState<AvisoGlobal | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null | undefined>(undefined);
  const [proximoAgendamento, setProximoAgendamento] = useState<Agendamento | null | undefined>(undefined);
  const [irParaFormulario, setIrParaFormulario] = useState(false);
  // O token fica só aqui (e no armazenamento seguro), nunca em estado de tela.
  const tokenRef = useRef<string | null>(null);

  // HU-03: busca o formulário mais recente. Sem conexão, mantém o que já tinha (e tenta de novo quando a tela pedir).
  const carregarFormulario = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const { formulario: atual } = await apiFormulario.atual(token);
      setFormulario(atual);
    } catch {
      // segue sem o formulário; a tela inicial mostra o botão "Tentar de novo"
    }
  }, []);

  // HU-04: busca a doação agendada que ainda vai acontecer. Sem conexão, mantém o que já tinha.
  const carregarAgendamento = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const { agendamento } = await apiAgenda.proximo(token);
      setProximoAgendamento(agendamento);
    } catch {
      // segue com o que tinha; as telas tentam de novo quando voltam a aparecer
    }
  }, []);

  // A validade (7 dias) e a espera (3 dias) passam com o app em segundo plano, e o horário agendado também chega:
  // ao voltar para o app, confere o formulário e o agendamento de novo.
  useEffect(() => {
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        void carregarFormulario();
        void carregarAgendamento();
      }
    });
    return () => assinatura.remove();
  }, [carregarFormulario, carregarAgendamento]);

  // A API recusou o nosso token (venceu ou a conta não existe mais): volta para a tela inicial.
  useEffect(() => {
    configurarSessaoExpirada(() => {
      tokenRef.current = null;
      void apagarToken();
      setDoador(null);
      setFormulario(undefined);
      setProximoAgendamento(undefined);
      setIrParaFormulario(false);
      setAviso({ tipo: "erro", texto: "Sua sessão expirou. Faça login novamente." });
    });
    return () => configurarSessaoExpirada(null);
  }, []);

  // Ao abrir o app: se há token guardado, confere com a API se ele ainda vale.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const salvo = await lerToken();
      if (salvo) {
        try {
          const { doador: atual } = await api.perfil(salvo);
          tokenRef.current = salvo;
          if (ativo) {
            setDoador(atual);
            void carregarFormulario();
            void carregarAgendamento();
          }
        } catch (erro) {
          if (erro instanceof ApiError && erro.status === 401) await apagarToken();
          // Sem conexão: segue para a tela inicial e tenta de novo na próxima abertura.
        }
      }
      if (ativo) setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [carregarFormulario, carregarAgendamento]);

  // contaNova: quem acabou de se cadastrar ainda não tem formulário nem agendamento, então nem precisa perguntar à API.
  const iniciarSessao = useCallback(
    async (token: string, atual: Doador, contaNova = false) => {
      await salvarToken(token);
      tokenRef.current = token;
      setDoador(atual);
      if (contaNova) {
        setFormulario(null);
        setProximoAgendamento(null);
      } else {
        void carregarFormulario();
        void carregarAgendamento();
      }
    },
    [carregarFormulario, carregarAgendamento],
  );

  const cadastrar = useCallback(
    async (dados: DadosCadastro) => {
      const { token, doador: novo } = await api.cadastrar(dados);
      // HU-01, cenário 1: a conta já nasce logada e a pessoa recebe as boas-vindas.
      setAviso({
        tipo: "sucesso",
        texto: `Bem-vinda(o), ${primeiroNome(novo.nome)}! Para liberar o agendamento de doações, responda ao formulário de elegibilidade.`,
      });
      setIrParaFormulario(true);
      await iniciarSessao(token, novo, true);
    },
    [iniciarSessao],
  );

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const { token, doador: atual } = await api.entrar(email, senha);
      setAviso(null);
      await iniciarSessao(token, atual);
    },
    [iniciarSessao],
  );

  const sair = useCallback(async () => {
    await apagarToken();
    tokenRef.current = null;
    setAviso(null);
    setFormulario(undefined);
    setProximoAgendamento(undefined);
    setIrParaFormulario(false);
    setDoador(null);
  }, []);

  // HU-11: salva telefone e/ou tipo sanguíneo e já atualiza o doador que o app mostra.
  const atualizarPerfil = useCallback(async (dados: AlteracaoPerfil) => {
    const token = tokenRef.current;
    if (!token) return;
    const { doador: atualizado } = await api.atualizarPerfil(token, dados);
    setDoador(atualizado);
  }, []);

  // HU-02: a API apaga a conta; depois encerramos a sessão e voltamos para a tela inicial.
  const excluirConta = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    await api.excluirConta(token);
    await apagarToken();
    tokenRef.current = null;
    setAviso({ tipo: "sucesso", texto: "Sua conta e todos os dados associados foram removidos com sucesso." });
    setFormulario(undefined);
    setProximoAgendamento(undefined);
    setIrParaFormulario(false);
    setDoador(null);
  }, []);

  const limparAviso = useCallback(() => setAviso(null), []);
  const concluirRedirecionamento = useCallback(() => setIrParaFormulario(false), []);

  // HU-03: as perguntas vêm da API, para as regras e os textos ficarem num lugar só.
  const buscarModeloDoFormulario = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) throw new ApiError(401, "Sessão inválida ou expirada. Faça login novamente.");
    const { modelo } = await apiFormulario.modelo(token);
    return modelo;
  }, []);

  const enviarFormulario = useCallback(async (respostas: Respostas) => {
    const token = tokenRef.current;
    if (!token) throw new ApiError(401, "Sessão inválida ou expirada. Faça login novamente.");
    const { formulario: novo } = await apiFormulario.enviar(token, respostas);
    setFormulario(novo);
    // O aviso "responda ao formulário" (boas-vindas) já cumpriu o papel.
    setAviso(null);
    return novo;
  }, []);

  // Nunca confia no formulário guardado no app: a API confere de novo (passou? ainda vale?) no momento da pergunta.
  const verificarAgendamento = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) throw new ApiError(401, "Sessão inválida ou expirada. Faça login novamente.");
    return apiFormulario.verificarAgendamento(token);
  }, []);

  const buscarAgenda = useCallback(async (instituicaoId: string) => {
    const token = tokenRef.current;
    if (!token) throw new ApiError(401, "Sessão inválida ou expirada. Faça login novamente.");
    return apiAgenda.agenda(token, instituicaoId);
  }, []);

  const agendar = useCallback(async (pedido: PedidoDeAgendamento) => {
    const token = tokenRef.current;
    if (!token) throw new ApiError(401, "Sessão inválida ou expirada. Faça login novamente.");
    const resposta = await apiAgenda.agendar(token, pedido);
    setProximoAgendamento(resposta.agendamento);
    // Quem confirmou outro tipo sanguíneo ao agendar também atualizou o perfil na API.
    setDoador((atual) => (atual ? { ...atual, tipoSanguineo: resposta.agendamento.tipoSanguineo } : atual));
    return resposta;
  }, []);

  const cancelarAgendamento = useCallback(async (id: string) => {
    const token = tokenRef.current;
    if (!token) throw new ApiError(401, "Sessão inválida ou expirada. Faça login novamente.");
    const { mensagem } = await apiAgenda.cancelar(token, id);
    setProximoAgendamento(null);
    return mensagem;
  }, []);

  const listarInstituicoes = useCallback(async (filtro: FiltroInstituicoes) => {
    const token = tokenRef.current;
    if (!token) throw new ApiError(401, "Sessão inválida ou expirada. Faça login novamente.");
    return apiInstituicoes.listar(token, filtro);
  }, []);

  const valor = useMemo(
    () => ({
      carregando,
      doador,
      aviso,
      cadastrar,
      entrar,
      sair,
      atualizarPerfil,
      excluirConta,
      limparAviso,
      formulario,
      irParaFormulario,
      concluirRedirecionamento,
      carregarFormulario,
      buscarModeloDoFormulario,
      enviarFormulario,
      verificarAgendamento,
      proximoAgendamento,
      carregarAgendamento,
      buscarAgenda,
      agendar,
      cancelarAgendamento,
      listarInstituicoes,
    }),
    [
      carregando,
      doador,
      aviso,
      cadastrar,
      entrar,
      sair,
      atualizarPerfil,
      excluirConta,
      limparAviso,
      formulario,
      irParaFormulario,
      concluirRedirecionamento,
      carregarFormulario,
      buscarModeloDoFormulario,
      enviarFormulario,
      verificarAgendamento,
      proximoAgendamento,
      carregarAgendamento,
      buscarAgenda,
      agendar,
      cancelarAgendamento,
      listarInstituicoes,
    ],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): Contexto {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth precisa estar dentro do AuthProvider.");
  return contexto;
}

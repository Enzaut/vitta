import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type AlteracaoPerfil, type DadosCadastro, type Doador } from "../api/auth";
import { ApiError, configurarSessaoExpirada } from "../api/client";
import { apiFormulario, type Formulario, type Modelo, type Respostas } from "../api/formulario";
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
  // HU-05: instituições de coleta (com a localização, só as que estão dentro do raio).
  listarInstituicoes(filtro: FiltroInstituicoes): Promise<ListaDeInstituicoes>;
};

const AuthContext = createContext<Contexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [doador, setDoador] = useState<Doador | null>(null);
  const [aviso, setAviso] = useState<AvisoGlobal | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null | undefined>(undefined);
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

  // A API recusou o nosso token (venceu ou a conta não existe mais): volta para a tela inicial.
  useEffect(() => {
    configurarSessaoExpirada(() => {
      tokenRef.current = null;
      void apagarToken();
      setDoador(null);
      setFormulario(undefined);
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
  }, [carregarFormulario]);

  // contaNova: quem acabou de se cadastrar ainda não tem formulário, então nem precisa perguntar à API.
  const iniciarSessao = useCallback(
    async (token: string, atual: Doador, contaNova = false) => {
      await salvarToken(token);
      tokenRef.current = token;
      setDoador(atual);
      if (contaNova) setFormulario(null);
      else void carregarFormulario();
    },
    [carregarFormulario],
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

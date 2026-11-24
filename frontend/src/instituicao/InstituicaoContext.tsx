import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  apiInstituicao,
  type Campanha,
  type ContaInstituicao,
  type DadosCadastroInstituicao,
  type DadosDaCampanha,
  type MinhaInstituicao,
  type PedidoDeInclusao,
} from "../api/instituicao";
import { ApiError, configurarSessaoDaInstituicaoExpirada } from "../api/client";
import { CHAVE_INSTITUICAO, apagarToken, lerToken, salvarToken } from "../storage/tokenStorage";

// A sessão de quem representa uma instituição. É separada da do doador (AuthContext): outro token, outra chave guardada.
export type AvisoDaInstituicao = { tipo: "sucesso" | "erro"; texto: string };

type Contexto = {
  carregando: boolean;
  conta: ContaInstituicao | null;
  aviso: AvisoDaInstituicao | null;
  limparAviso(): void;
  cadastrar(dados: DadosCadastroInstituicao): Promise<void>;
  entrar(email: string, senha: string): Promise<void>;
  sair(): Promise<void>;
  excluirConta(): Promise<void>;
  // O painel: conta, pedido de inclusão e instituição no mapa. undefined = ainda carregando (ou sem conexão).
  painel: MinhaInstituicao | undefined;
  carregarPainel(): Promise<void>;
  solicitarInclusao(pedido: PedidoDeInclusao): Promise<void>;
  // Só na demonstração: faz o papel de quem aprova ou recusa o pedido.
  simularDecisao(decisao: "APROVADA" | "RECUSADA", motivo?: string): Promise<void>;
  atualizarDados(dados: { telefone?: string | null; horario?: string }): Promise<void>;
  atualizarEstoque(tiposEmFalta: string[]): Promise<void>;
  // Campanhas relâmpago da instituição. undefined = ainda carregando (ou sem conexão).
  campanhas: Campanha[] | undefined;
  carregarCampanhas(): Promise<void>;
  criarCampanha(dados: DadosDaCampanha): Promise<void>;
  atualizarCampanha(id: string, dados: Partial<DadosDaCampanha>): Promise<void>;
  encerrarCampanha(id: string): Promise<void>;
  excluirCampanha(id: string): Promise<void>;
};

const InstituicaoContext = createContext<Contexto | null>(null);

const MSG_SESSAO = "Sessão inválida ou expirada. Faça login novamente.";

export function InstituicaoProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [conta, setConta] = useState<ContaInstituicao | null>(null);
  const [aviso, setAviso] = useState<AvisoDaInstituicao | null>(null);
  const [painel, setPainel] = useState<MinhaInstituicao | undefined>(undefined);
  const [campanhas, setCampanhas] = useState<Campanha[] | undefined>(undefined);
  // O token fica só aqui (e no armazenamento seguro), nunca em estado de tela.
  const tokenRef = useRef<string | null>(null);

  const exigirToken = useCallback(() => {
    if (!tokenRef.current) throw new ApiError(401, MSG_SESSAO);
    return tokenRef.current;
  }, []);

  const encerrarSessao = useCallback(() => {
    tokenRef.current = null;
    setConta(null);
    setPainel(undefined);
    setCampanhas(undefined);
  }, []);

  // Sem conexão, mantém o que já tinha (e a tela tenta de novo quando voltar a aparecer).
  const carregarPainel = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      setPainel(await apiInstituicao.minha(token));
    } catch {
      // segue com o que tinha
    }
  }, []);

  const carregarCampanhas = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      setCampanhas((await apiInstituicao.listarCampanhas(token)).campanhas);
    } catch (erro) {
      // Antes de a instituição ser aprovada a API responde 409: ainda não há campanhas.
      if (erro instanceof ApiError && erro.status === 409) setCampanhas([]);
    }
  }, []);

  // A API recusou o nosso token (venceu ou a conta não existe mais): volta para a tela inicial.
  useEffect(() => {
    configurarSessaoDaInstituicaoExpirada(() => {
      void apagarToken(CHAVE_INSTITUICAO);
      encerrarSessao();
      setAviso({ tipo: "erro", texto: "Sua sessão expirou. Faça login novamente." });
    });
    return () => configurarSessaoDaInstituicaoExpirada(null);
  }, [encerrarSessao]);

  // Ao abrir o app: se há token de instituição guardado, confere com a API se ele ainda vale.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const salvo = await lerToken(CHAVE_INSTITUICAO);
      if (salvo) {
        try {
          const atual = await apiInstituicao.minha(salvo);
          tokenRef.current = salvo;
          if (ativo) {
            setConta(atual.conta);
            setPainel(atual);
          }
        } catch (erro) {
          if (erro instanceof ApiError && erro.status === 401) await apagarToken(CHAVE_INSTITUICAO);
          // Sem conexão: segue para a tela inicial e tenta de novo na próxima abertura.
        }
      }
      if (ativo) setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const iniciarSessao = useCallback(async (token: string, nova: ContaInstituicao) => {
    await salvarToken(token, CHAVE_INSTITUICAO);
    tokenRef.current = token;
    setConta(nova);
    setPainel(undefined);
    setCampanhas(undefined);
    try {
      setPainel(await apiInstituicao.minha(token));
    } catch {
      // o painel tenta de novo quando a tela abrir
    }
  }, []);

  const cadastrar = useCallback(
    async (dados: DadosCadastroInstituicao) => {
      const { token, conta: nova } = await apiInstituicao.cadastrar(dados);
      setAviso({
        tipo: "sucesso",
        texto: "Conta criada! O próximo passo é pedir a inclusão da sua instituição no mapa.",
      });
      await iniciarSessao(token, nova);
    },
    [iniciarSessao],
  );

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const { token, conta: atual } = await apiInstituicao.entrar(email, senha);
      setAviso(null);
      await iniciarSessao(token, atual);
    },
    [iniciarSessao],
  );

  const sair = useCallback(async () => {
    await apagarToken(CHAVE_INSTITUICAO);
    setAviso(null);
    encerrarSessao();
  }, [encerrarSessao]);

  const excluirConta = useCallback(async () => {
    await apiInstituicao.excluirConta(exigirToken());
    await apagarToken(CHAVE_INSTITUICAO);
    encerrarSessao();
    setAviso({ tipo: "sucesso", texto: "A conta da instituição e todos os dados dela foram removidos com sucesso." });
  }, [encerrarSessao, exigirToken]);

  const solicitarInclusao = useCallback(
    async (pedido: PedidoDeInclusao) => {
      setPainel(await apiInstituicao.solicitarInclusao(exigirToken(), pedido));
    },
    [exigirToken],
  );

  const simularDecisao = useCallback(
    async (decisao: "APROVADA" | "RECUSADA", motivo?: string) => {
      setPainel(await apiInstituicao.simularDecisao(exigirToken(), decisao, motivo));
    },
    [exigirToken],
  );

  const atualizarDados = useCallback(
    async (dados: { telefone?: string | null; horario?: string }) => {
      setPainel(await apiInstituicao.atualizarDados(exigirToken(), dados));
    },
    [exigirToken],
  );

  const atualizarEstoque = useCallback(
    async (tiposEmFalta: string[]) => {
      setPainel(await apiInstituicao.atualizarEstoque(exigirToken(), tiposEmFalta));
    },
    [exigirToken],
  );

  const criarCampanha = useCallback(
    async (dados: DadosDaCampanha) => {
      await apiInstituicao.criarCampanha(exigirToken(), dados);
      await carregarCampanhas();
    },
    [carregarCampanhas, exigirToken],
  );

  const atualizarCampanha = useCallback(
    async (id: string, dados: Partial<DadosDaCampanha>) => {
      await apiInstituicao.atualizarCampanha(exigirToken(), id, dados);
      await carregarCampanhas();
    },
    [carregarCampanhas, exigirToken],
  );

  const encerrarCampanha = useCallback(
    async (id: string) => {
      await apiInstituicao.encerrarCampanha(exigirToken(), id);
      await carregarCampanhas();
    },
    [carregarCampanhas, exigirToken],
  );

  const excluirCampanha = useCallback(
    async (id: string) => {
      await apiInstituicao.excluirCampanha(exigirToken(), id);
      await carregarCampanhas();
    },
    [carregarCampanhas, exigirToken],
  );

  const limparAviso = useCallback(() => setAviso(null), []);

  const valor = useMemo(
    () => ({
      carregando,
      conta,
      aviso,
      limparAviso,
      cadastrar,
      entrar,
      sair,
      excluirConta,
      painel,
      carregarPainel,
      solicitarInclusao,
      simularDecisao,
      atualizarDados,
      atualizarEstoque,
      campanhas,
      carregarCampanhas,
      criarCampanha,
      atualizarCampanha,
      encerrarCampanha,
      excluirCampanha,
    }),
    [
      carregando,
      conta,
      aviso,
      limparAviso,
      cadastrar,
      entrar,
      sair,
      excluirConta,
      painel,
      carregarPainel,
      solicitarInclusao,
      simularDecisao,
      atualizarDados,
      atualizarEstoque,
      campanhas,
      carregarCampanhas,
      criarCampanha,
      atualizarCampanha,
      encerrarCampanha,
      excluirCampanha,
    ],
  );

  return <InstituicaoContext.Provider value={valor}>{children}</InstituicaoContext.Provider>;
}

export function useInstituicao(): Contexto {
  const contexto = useContext(InstituicaoContext);
  if (!contexto) throw new Error("useInstituicao precisa estar dentro do InstituicaoProvider.");
  return contexto;
}

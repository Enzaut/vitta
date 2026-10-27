import { API_CONFIGURADA, API_URL } from "../config";

// Erro devolvido pela API (ou falta de conexão, quando status = 0).
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    // Mensagem por campo, ex.: { email: "Este e-mail já está em uso." }
    public readonly campos?: Record<string, string>,
  ) {
    super(mensagem);
    this.name = "ApiError";
  }

  get semConexao() {
    return this.status === 0;
  }
}

const MSG_SEM_CONEXAO = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";

// Chamado quando a API recusa um token que tínhamos (sessão vencida ou conta excluída).
let aoSessaoExpirar: (() => void) | null = null;
export function configurarSessaoExpirada(funcao: (() => void) | null) {
  aoSessaoExpirar = funcao;
}

type Opcoes = {
  metodo?: "GET" | "POST" | "PATCH" | "DELETE";
  corpo?: unknown;
  token?: string | null;
  timeoutMs?: number;
};

export async function requisicao<T>(
  caminho: string,
  { metodo = "GET", corpo, token, timeoutMs = 25_000 }: Opcoes = {},
): Promise<T> {
  if (!API_CONFIGURADA) {
    throw new ApiError(0, "Endereço da API não configurado. Defina EXPO_PUBLIC_API_URL no arquivo frontend/.env.");
  }

  // Sem resposta em alguns segundos, desiste em vez de deixar a tela travada.
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), timeoutMs);

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: {
        Accept: "application/json",
        ...(corpo !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
    });
  } catch {
    throw new ApiError(0, MSG_SEM_CONEXAO);
  } finally {
    clearTimeout(relogio);
  }

  if (resposta.status === 204) return undefined as T;

  const dados = (await resposta.json().catch(() => ({}))) as { mensagem?: string; campos?: Record<string, string> };
  if (!resposta.ok) {
    if (resposta.status === 401 && token) aoSessaoExpirar?.();
    throw new ApiError(
      resposta.status,
      typeof dados.mensagem === "string" ? dados.mensagem : "Erro inesperado. Tente novamente.",
      dados.campos,
    );
  }
  return dados as T;
}

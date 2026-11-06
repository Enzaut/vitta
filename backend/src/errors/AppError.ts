// Erro "esperado" da aplicação: carrega o status HTTP e a mensagem que o app mostra ao usuário.
export type ExtrasDoErro = {
  // Dados a mais no corpo da resposta, ao lado da mensagem (ex.: { podeResponderEm: "..." }).
  corpo?: Record<string, unknown>;
  // Cabeçalhos HTTP da resposta (ex.: { "Retry-After": "3600" }).
  cabecalhos?: Record<string, string>;
};

export class AppError extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    // Erros por campo, ex.: { email: "Informe um endereço de e-mail válido." }
    public readonly campos?: Record<string, string>,
    public readonly extras?: ExtrasDoErro,
  ) {
    super(mensagem);
    this.name = "AppError";
  }
}

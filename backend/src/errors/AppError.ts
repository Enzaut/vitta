// Erro "esperado" da aplicação: carrega o status HTTP e a mensagem que o app mostra ao usuário.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    // Erros por campo, ex.: { email: "Informe um endereço de e-mail válido." }
    public readonly campos?: Record<string, string>,
  ) {
    super(mensagem);
    this.name = "AppError";
  }
}

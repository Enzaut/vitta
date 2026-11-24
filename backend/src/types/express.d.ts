// Acrescenta ao Request do Express o id do doador logado (preenchido pelo middleware autenticar).
declare global {
  namespace Express {
    interface Request {
      doadorId?: string;
      // Preenchido pelo middleware autenticarInstituicao (token com papel "instituicao").
      contaInstituicaoId?: string;
    }
  }
}

export {};

import bcrypt from "bcryptjs";
import { env } from "../config/env";

// Regra de complexidade da senha (caso de uso Cadastro e Login, RN06):
// mínimo de 8 caracteres, com pelo menos uma letra maiúscula, um número e um caractere especial.
export const ESPECIAIS = "!@#$%*";

export function senhaAtendeRegra(senha: string): boolean {
  return (
    senha.length >= 8 &&
    /[A-Z]/.test(senha) &&
    /[0-9]/.test(senha) &&
    [...ESPECIAIS].some((c) => senha.includes(c))
  );
}

// Guardamos só o hash (RE03: a senha nunca fica em texto puro).
export function gerarHash(senha: string): Promise<string> {
  return bcrypt.hash(senha, env.bcryptCost);
}

export function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

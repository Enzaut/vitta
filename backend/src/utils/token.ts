import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Quem é o dono do token: o doador (app dos doadores) ou a conta de uma instituição.
export type Papel = "doador" | "instituicao";
export type Credencial = { id: string; papel: Papel };

export type DadosDoToken = { sub: string; papel: Papel };

export function gerarToken(id: string, papel: Papel = "doador"): string {
  return jwt.sign({ papel }, env.jwtSecret, {
    subject: id,
    // O tipo da lib é estrito para esse campo; o valor vem do .env ("7d", "12h"...).
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

// Devolve quem é o dono do token se ele for válido (assinatura correta e não vencido); senão, null.
// Tokens antigos, emitidos antes de existir o papel, são de doador.
export function lerCredencial(token: string): Credencial | null {
  try {
    const dados = jwt.verify(token, env.jwtSecret);
    if (typeof dados === "string" || typeof dados.sub !== "string") return null;
    const papel = dados.papel ?? "doador";
    if (papel !== "doador" && papel !== "instituicao") return null;
    return { id: dados.sub, papel };
  } catch {
    return null;
  }
}

// Só para o app dos doadores: o id do doador, ou null se o token for inválido ou de outro papel.
export function lerToken(token: string): string | null {
  const credencial = lerCredencial(token);
  return credencial?.papel === "doador" ? credencial.id : null;
}

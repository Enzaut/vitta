import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type DadosDoToken = { sub: string };

export function gerarToken(doadorId: string): string {
  return jwt.sign({}, env.jwtSecret, {
    subject: doadorId,
    // O tipo da lib é estrito para esse campo; o valor vem do .env ("7d", "12h"...).
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

// Devolve o id do doador se o token for válido (assinatura correta e não vencido); senão, null.
export function lerToken(token: string): string | null {
  try {
    const dados = jwt.verify(token, env.jwtSecret);
    if (typeof dados === "string" || typeof dados.sub !== "string") return null;
    return dados.sub;
  } catch {
    return null;
  }
}

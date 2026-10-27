import "dotenv/config";

const SEGREDO_DE_DESENVOLVIMENTO = "segredo-apenas-para-desenvolvimento";

const producao = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET ?? SEGREDO_DE_DESENVOLVIMENTO;

// Em produção não aceitamos o segredo de desenvolvimento nem um segredo curto.
if (producao && (jwtSecret === SEGREDO_DE_DESENVOLVIMENTO || jwtSecret.length < 32)) {
  throw new Error("Defina JWT_SECRET com pelo menos 32 caracteres em produção.");
}

export const env = {
  producao,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret,
  // Quanto tempo o token vale (ex.: "7d", "12h").
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  // Custo do bcrypt. Maior = mais seguro e mais lento. Nos testes usamos um valor baixo.
  bcryptCost: Number(process.env.BCRYPT_COST ?? 12),
  // Endereços de sites que podem chamar a API pelo navegador (a versão web do app), separados por vírgula. "*" libera todos.
  corsOrigens: (process.env.CORS_ORIGENS ?? "")
    .split(",")
    .map((origem) => origem.trim())
    .filter(Boolean),
};

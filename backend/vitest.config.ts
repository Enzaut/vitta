import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Os testes usam o mesmo banco, então rodam um arquivo por vez.
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      // Custo baixo do bcrypt para os testes não ficarem lentos.
      BCRYPT_COST: "4",
      JWT_SECRET: "segredo-de-teste-apenas",
      JWT_EXPIRES_IN: "1h",
    },
  },
});

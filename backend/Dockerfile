FROM node:22-slim

# O Prisma precisa do openssl
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala as dependências primeiro (aproveita o cache do Docker)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Gera o client do Prisma. Não conecta no banco: a URL abaixo é fictícia
# e só existe para o prisma.config.ts conseguir carregar.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

EXPOSE 3000

# Ao iniciar: aplica as migrations pendentes, carrega as instituições do mapa (sem duplicar) e sobe a API
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx src/index.ts"]

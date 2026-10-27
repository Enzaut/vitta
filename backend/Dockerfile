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

# Ao iniciar: espera o banco responder (na internet ele pode demorar a ficar pronto, por até uns 100 segundos),
# aplica as migrations pendentes, carrega as instituições do mapa (sem duplicar) e sobe a API
CMD ["sh", "-c", "n=0; until npx prisma migrate deploy; do n=$((n+1)); if [ $n -ge 20 ]; then echo 'O banco nao respondeu. Desistindo.'; exit 1; fi; echo 'Banco ainda nao esta pronto, tentando de novo em 5 segundos...'; sleep 5; done; npx tsx prisma/seed.ts && npx tsx src/index.ts"]

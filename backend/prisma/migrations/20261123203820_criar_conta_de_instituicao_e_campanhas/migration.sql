-- CreateEnum
CREATE TYPE "SituacaoDaSolicitacao" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA');

-- CreateTable
CREATE TABLE "contas_instituicao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "telefone" TEXT,
    "senhaHash" TEXT NOT NULL,
    "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3),
    "instituicaoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_instituicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_inclusao" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "telefone" TEXT,
    "horario" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "situacao" "SituacaoDaSolicitacao" NOT NULL DEFAULT 'PENDENTE',
    "motivoRecusa" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididaEm" TIMESTAMP(3),

    CONSTRAINT "solicitacoes_inclusao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas" (
    "id" TEXT NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tiposSanguineos" "TipoSanguineo"[],
    "validaAte" DATE NOT NULL,
    "encerradaEm" TIMESTAMP(3),
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contas_instituicao_email_key" ON "contas_instituicao"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contas_instituicao_cnpj_key" ON "contas_instituicao"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "contas_instituicao_instituicaoId_key" ON "contas_instituicao"("instituicaoId");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_inclusao_contaId_key" ON "solicitacoes_inclusao"("contaId");

-- CreateIndex
CREATE INDEX "campanhas_instituicaoId_idx" ON "campanhas"("instituicaoId");

-- AddForeignKey
ALTER TABLE "contas_instituicao" ADD CONSTRAINT "contas_instituicao_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_inclusao" ADD CONSTRAINT "solicitacoes_inclusao_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas_instituicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

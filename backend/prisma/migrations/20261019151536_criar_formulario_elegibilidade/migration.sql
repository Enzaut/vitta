-- CreateEnum
CREATE TYPE "ResultadoElegibilidade" AS ENUM ('APTO', 'INAPTO_TEMPORARIO', 'INAPTO', 'AVALIACAO');

-- CreateTable
CREATE TABLE "formularios_elegibilidade" (
    "id" TEXT NOT NULL,
    "doadorId" TEXT NOT NULL,
    "preenchidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validoAte" DATE NOT NULL,
    "resultado" "ResultadoElegibilidade" NOT NULL,
    "liberadoEm" DATE,
    "mensagem" TEXT NOT NULL,
    "motivos" JSONB NOT NULL,
    "avisos" JSONB NOT NULL,
    "versaoRegras" TEXT NOT NULL,
    "respostas" JSONB NOT NULL,

    CONSTRAINT "formularios_elegibilidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "formularios_elegibilidade_doadorId_key" ON "formularios_elegibilidade"("doadorId");

-- AddForeignKey
ALTER TABLE "formularios_elegibilidade" ADD CONSTRAINT "formularios_elegibilidade_doadorId_fkey" FOREIGN KEY ("doadorId") REFERENCES "doadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('AGENDADO', 'FINALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "doadorId" TEXT NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    "medicoCodigo" TEXT NOT NULL,
    "medicoNome" TEXT NOT NULL,
    "medicoEspecialidade" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    "tipoSanguineo" "TipoSanguineo" NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'AGENDADO',
    "protocolo" TEXT NOT NULL,
    "reservaDoHorario" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladoEm" TIMESTAMP(3),

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agendamentos_reservaDoHorario_key" ON "agendamentos"("reservaDoHorario");

-- CreateIndex
CREATE INDEX "agendamentos_doadorId_inicio_idx" ON "agendamentos"("doadorId", "inicio");

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_doadorId_fkey" FOREIGN KEY ("doadorId") REFERENCES "doadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "TipoSanguineo" AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- AlterTable
ALTER TABLE "doadores" ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "tipoSanguineo" "TipoSanguineo";

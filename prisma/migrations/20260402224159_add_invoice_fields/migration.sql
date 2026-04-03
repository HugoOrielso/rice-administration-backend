/*
  Warnings:

  - Added the required column `documentNumber` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `documentType` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CEDULA_CIUDADANIA', 'NIT', 'CEDULA_EXTRANJERIA', 'RIF', 'PPT');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "documentNumber" TEXT NOT NULL,
ADD COLUMN     "documentType" "DocumentType" NOT NULL;

-- CreateIndex
CREATE INDEX "Invoice_documentType_idx" ON "Invoice"("documentType");

-- CreateIndex
CREATE INDEX "Invoice_documentNumber_idx" ON "Invoice"("documentNumber");

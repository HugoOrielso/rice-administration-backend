/*
  Warnings:

  - The values [RG,RIF,PPT] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('REGISTRO_CIVIL', 'TARJETA_EXTRANJERIA', 'CEDULA_CIUDADANIA', 'CEDULA_EXTRANJERIA', 'NIT', 'PASAPORTE', 'TARJETA_IDENTIDAD', 'DNI', 'CARTEIRA_IDENTIDADE', 'OTRO');
ALTER TABLE "Invoice" ALTER COLUMN "documentType" TYPE "DocumentType_new" USING ("documentType"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "public"."DocumentType_old";
COMMIT;

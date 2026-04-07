/*
  Warnings:

  - You are about to drop the column `city` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `Invoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "department",
ADD COLUMN     "customerCity" TEXT DEFAULT 'Villa del Rosario',
ADD COLUMN     "customerCountry" TEXT DEFAULT 'Colombia',
ADD COLUMN     "customerDepartment" TEXT DEFAULT 'Norte de Santander';

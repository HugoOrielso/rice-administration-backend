-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "city" TEXT DEFAULT 'Villa del Rosario',
ADD COLUMN     "country" TEXT DEFAULT 'Colombia',
ADD COLUMN     "department" TEXT DEFAULT 'Norte de Santander';

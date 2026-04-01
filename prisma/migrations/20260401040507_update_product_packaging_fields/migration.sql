/*
  Warnings:

  - You are about to drop the column `weightKg` on the `InvoiceItem` table. All the data in the column will be lost.
  - You are about to drop the column `weightKg` on the `Product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_productId_fkey";

-- AlterTable
ALTER TABLE "InvoiceItem" DROP COLUMN "weightKg",
ADD COLUMN     "packageLabel" TEXT,
ADD COLUMN     "totalPackageWeightKg" DECIMAL(10,2),
ADD COLUMN     "unitLabel" TEXT,
ADD COLUMN     "unitWeightKg" DECIMAL(10,2),
ADD COLUMN     "unitsPerPackage" INTEGER,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "weightKg",
ADD COLUMN     "packageLabel" TEXT,
ADD COLUMN     "totalPackageWeightKg" DECIMAL(10,2),
ADD COLUMN     "unitLabel" TEXT,
ADD COLUMN     "unitWeightKg" DECIMAL(10,2),
ADD COLUMN     "unitsPerPackage" INTEGER;

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_productId_idx" ON "InvoiceItem"("productId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

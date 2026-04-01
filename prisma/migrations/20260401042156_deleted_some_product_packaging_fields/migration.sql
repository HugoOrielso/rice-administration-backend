/*
  Warnings:

  - You are about to drop the column `totalPackageWeightKg` on the `InvoiceItem` table. All the data in the column will be lost.
  - You are about to drop the column `unitLabel` on the `InvoiceItem` table. All the data in the column will be lost.
  - You are about to drop the column `unitWeightKg` on the `InvoiceItem` table. All the data in the column will be lost.
  - You are about to drop the column `totalPackageWeightKg` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unitLabel` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unitWeightKg` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InvoiceItem" DROP COLUMN "totalPackageWeightKg",
DROP COLUMN "unitLabel",
DROP COLUMN "unitWeightKg",
ADD COLUMN     "unitWeightGrams" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "totalPackageWeightKg",
DROP COLUMN "unitLabel",
DROP COLUMN "unitWeightKg",
ADD COLUMN     "unitWeightGrams" DECIMAL(10,2);

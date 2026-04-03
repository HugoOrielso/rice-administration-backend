-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentMethodType" TEXT,
ADD COLUMN     "wompiPayload" JSONB,
ADD COLUMN     "wompiTransactionId" TEXT;

-- CreateEnum
CREATE TYPE "PaymentDurum" AS ENUM ('bekliyor', 'basarili', 'basarisiz');

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tutar" INTEGER NOT NULL,
    "durum" "PaymentDurum" NOT NULL DEFAULT 'bekliyor',
    "iyzicoRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

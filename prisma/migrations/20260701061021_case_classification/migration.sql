-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "belgeTipi" TEXT,
ADD COLUMN     "bilgiTamam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eksikBilgiler" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "merci" TEXT;

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "asama" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputToken" INTEGER NOT NULL,
    "outputToken" INTEGER NOT NULL,
    "tahminiKurus" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

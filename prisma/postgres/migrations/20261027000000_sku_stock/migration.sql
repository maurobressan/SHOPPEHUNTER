-- CreateTable
CREATE TABLE "SkuStock" (
    "accountId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 15,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkuStock_pkey" PRIMARY KEY ("accountId","sku")
);

-- AddForeignKey
ALTER TABLE "SkuStock" ADD CONSTRAINT "SkuStock_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
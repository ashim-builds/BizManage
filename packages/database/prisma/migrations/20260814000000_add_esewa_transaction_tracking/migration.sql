ALTER TABLE "SubscriptionPayment"
  ADD COLUMN "gatewayTransactionUuid" TEXT,
  ADD COLUMN "gatewayStatus" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "verificationResponse" JSONB;

CREATE UNIQUE INDEX "SubscriptionPayment_gatewayTransactionUuid_key"
  ON "SubscriptionPayment"("gatewayTransactionUuid");

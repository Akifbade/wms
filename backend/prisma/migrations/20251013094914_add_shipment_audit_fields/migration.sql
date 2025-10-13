-- AlterTable
ALTER TABLE "shipments" ADD COLUMN "clientEmail" TEXT;
ALTER TABLE "shipments" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "shipments" ADD COLUMN "description" TEXT;
ALTER TABLE "shipments" ADD COLUMN "estimatedValue" REAL;
ALTER TABLE "shipments" ADD COLUMN "notes" TEXT;
ALTER TABLE "shipments" ADD COLUMN "updatedBy" TEXT;

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "geocodeSourceProvider" TEXT,
    "geocodeConfidence" TEXT,
    "buildingName" TEXT,
    "dongHo" TEXT,
    "propertyType" TEXT NOT NULL,
    "floor" INTEGER,
    "exclusiveArea" REAL,
    "contractArea" REAL,
    "landArea" REAL,
    "builtYear" INTEGER,
    "direction" TEXT,
    "parking" TEXT,
    "appraisalPrice" REAL,
    "askingPrice" REAL,
    "memo" TEXT,
    "isAuction" BOOLEAN NOT NULL DEFAULT false,
    "radiusSettings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuctionInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "court" TEXT NOT NULL,
    "appraisalPrice" REAL,
    "minimumSalePrice" REAL,
    "failedBidCount" INTEGER,
    "saleDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuctionInfo_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "analysisCategory" TEXT NOT NULL,
    "metricLabel" TEXT NOT NULL,
    "metricValue" TEXT NOT NULL,
    "metricUnit" TEXT,
    "sourceOrganization" TEXT NOT NULL,
    "sourceDataset" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "dataPeriodStart" DATETIME,
    "dataPeriodEnd" DATETIME,
    "asOfDate" DATETIME,
    "retrievedAt" DATETIME NOT NULL,
    "geographicUnit" TEXT,
    "radiusMeters" INTEGER,
    "rawSampleCount" INTEGER,
    "excludedSampleCount" INTEGER,
    "usedSampleCount" INTEGER,
    "filterDescription" TEXT,
    "calculationMethod" TEXT,
    "evidenceType" TEXT NOT NULL,
    "confidenceScore" INTEGER,
    "confidenceReason" TEXT,
    "limitations" TEXT,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evidence_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RawDataRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evidenceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "includedInCalculation" BOOLEAN NOT NULL DEFAULT true,
    "isOutlierCandidate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RawDataRecord_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComparableCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "address" TEXT,
    "buildingName" TEXT,
    "distanceMeters" REAL,
    "floor" INTEGER,
    "exclusiveArea" REAL,
    "transactionDate" DATETIME,
    "priceAmount" REAL,
    "pricePerArea" REAL,
    "caseNumber" TEXT,
    "court" TEXT,
    "minimumSalePrice" REAL,
    "failedBidCount" INTEGER,
    "bidderCount" INTEGER,
    "winningBidRatio" REAL,
    "deposit" REAL,
    "monthlyRent" REAL,
    "managementFee" REAL,
    "isActualContract" BOOLEAN,
    "similarityScore" INTEGER NOT NULL,
    "similarityReasons" TEXT NOT NULL,
    "similarityGrade" TEXT NOT NULL,
    "dataSourceType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComparableCase_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "tabKey" TEXT NOT NULL,
    "completionRate" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "summaryJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisSnapshot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "sectionsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIReport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT,
    "importerType" TEXT NOT NULL,
    "originalFileName" TEXT,
    "extractedFieldsJson" TEXT NOT NULL,
    "approvedFieldsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportedDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProviderCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerKey" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "ttlSeconds" INTEGER NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionInfo_propertyId_key" ON "AuctionInfo"("propertyId");

-- CreateIndex
CREATE INDEX "Evidence_propertyId_analysisCategory_idx" ON "Evidence"("propertyId", "analysisCategory");

-- CreateIndex
CREATE INDEX "ComparableCase_propertyId_caseType_idx" ON "ComparableCase"("propertyId", "caseType");

-- CreateIndex
CREATE INDEX "AnalysisSnapshot_propertyId_tabKey_idx" ON "AnalysisSnapshot"("propertyId", "tabKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCache_providerKey_cacheKey_key" ON "ProviderCache"("providerKey", "cacheKey");

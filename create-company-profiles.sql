CREATE TABLE company_profiles (
  id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description LONGTEXT,
  logo VARCHAR(191),
  contactPerson VARCHAR(191),
  contactPhone VARCHAR(191),
  contractStatus VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  isActive BOOLEAN NOT NULL DEFAULT true,
  companyId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (id),
  UNIQUE KEY `company_profiles_name_companyId_key` (name, companyId),
  KEY `company_profiles_companyId_idx` (companyId),
  CONSTRAINT `company_profiles_companyId_fkey` FOREIGN KEY (companyId) REFERENCES companies (id) ON DELETE CASCADE
);

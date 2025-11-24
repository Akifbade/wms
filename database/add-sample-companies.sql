-- Add Sample Company Profiles
-- Run this in phpMyAdmin SQL tab for warehouse_wms database

INSERT INTO CompanyProfile (id, name, contactPerson, contactPhone, description, createdAt, updatedAt)
VALUES 
  ('company-dior-001', 'DIOR', 'Jean Dupont', '+965 2222 3333', 'Luxury fashion and cosmetics brand', NOW(), NOW()),
  ('company-gucci-002', 'GUCCI', 'Marco Rossi', '+965 3333 4444', 'Italian luxury fashion house', NOW(), NOW()),
  ('company-lv-003', 'LOUIS VUITTON', 'Pierre Martin', '+965 4444 5555', 'French luxury fashion brand', NOW(), NOW()),
  ('company-chanel-004', 'CHANEL', 'Sophie Laurent', '+965 5555 6666', 'French luxury fashion house', NOW(), NOW()),
  ('company-prada-005', 'PRADA', 'Giovanni Romano', '+965 6666 7777', 'Italian luxury fashion brand', NOW(), NOW());

-- Now update some existing shipments to link them to these companies
-- First, let's see what shipments exist
-- SELECT id, referenceId, clientName FROM Shipment LIMIT 10;

-- Example: Link shipments to companies (adjust IDs based on your shipments)
-- UPDATE Shipment SET companyProfileId = 'company-dior-001' WHERE clientName LIKE '%DIOR%';
-- UPDATE Shipment SET companyProfileId = 'company-gucci-002' WHERE clientName LIKE '%GUCCI%';
-- UPDATE Shipment SET companyProfileId = 'company-lv-003' WHERE clientName LIKE '%LOUIS VUITTON%' OR clientName LIKE '%LV%';

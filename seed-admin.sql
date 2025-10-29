USE warehouse_wms;

-- Insert test company
INSERT INTO companies (id, name, email, phone, address, website, plan, ratePerDay, currency, isActive, createdAt, updatedAt) 
VALUES (
  'cly2hx8a10000001abc123def',
  'Test Company',
  'test@company.com',
  '+1234567890',
  'Test Address',
  'https://test.com',
  'BASIC',
  2.5,
  'USD',
  1,
  NOW(),
  NOW()
);

-- Insert admin user (password hash for "admin@test.com")
INSERT INTO users (id, email, password, name, phone, role, isActive, companyId, createdAt, updatedAt)
VALUES (
  'cly2hx8a10000002xyz456abc',
  'admin@test.com',
  '$2a$10$xNBwqqiYHgcMovKVpZjbTu4YUPT3Bkv1tFI6uv6gk.XgmpTiNmIwe',
  'Test Admin',
  '+1234567890',
  'ADMIN',
  1,
  'cly2hx8a10000001abc123def',
  NOW(),
  NOW()
);

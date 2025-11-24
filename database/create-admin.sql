-- Create test company
INSERT INTO companies (id, name, email, isActive, createdAt, updatedAt) 
VALUES ('test-company-001', 'WMS Admin Company', 'admin@wms.com', 1, NOW(), NOW());

-- Create admin user (password: admin123)
INSERT INTO users (id, email, password, name, role, companyId, isActive, createdAt, updatedAt) 
VALUES ('admin-user-001', 'admin@wms.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1KNQZ0xN7KM7cR8R1fTwH0fXz2zG3fO', 'Admin User', 'ADMIN', 'test-company-001', 1, NOW(), NOW());

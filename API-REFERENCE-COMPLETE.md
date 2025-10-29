# 📚 Category System - Complete API Reference

**Status:** ✅ PRODUCTION READY  
**Last Updated:** Today  
**Base URL Local:** http://localhost:5000  
**Base URL Staging:** http://148.230.107.155:5001  

---

## 🎯 Category Endpoints

### 1. Create Category
```http
POST /api/categories/
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
{
  "companyId": "company-123",      // Required: Your company ID
  "name": "DIOR",                  // Required: Category name
  "description": "Luxury items",   // Optional
  "color": "#FF5733",              // Optional: Hex color code
  "icon": "diamond",               // Optional: Icon name
  "logo": <file>                   // Optional: Logo file (PNG/JPG)
}

Response (201 Created):
{
  "category": {
    "id": "cat-456",
    "name": "DIOR",
    "description": "Luxury items",
    "color": "#FF5733",
    "icon": "diamond",
    "logo": "/uploads/categories/cat-456-logo.png",
    "companyId": "company-123",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. List Categories
```http
GET /api/categories/:companyId
Authorization: Bearer <token>

Parameters:
  - companyId (path): Your company ID

Response (200 OK):
{
  "categories": [
    {
      "id": "cat-456",
      "name": "DIOR",
      "color": "#FF5733",
      "logo": "/uploads/categories/cat-456-logo.png",
      "isActive": true,
      // ... other fields
    },
    {
      "id": "cat-789",
      "name": "COMPANY_MATERIAL",
      "color": "#0066FF",
      "logo": "/uploads/categories/cat-789-logo.png",
      "isActive": true
    }
  ]
}
```

### 3. Get Category Detail
```http
GET /api/categories/detail/:categoryId
Authorization: Bearer <token>

Parameters:
  - categoryId (path): Category ID

Response (200 OK):
{
  "category": {
    "id": "cat-456",
    "name": "DIOR",
    "description": "Luxury items",
    "color": "#FF5733",
    "icon": "diamond",
    "logo": "/uploads/categories/cat-456-logo.png",
    "companyId": "company-123",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "company": {
      "id": "company-123",
      "name": "My Company",
      // ... company details
    }
  }
}
```

### 4. Update Category
```http
PUT /api/categories/:categoryId
Content-Type: multipart/form-data
Authorization: Bearer <token>

Parameters:
  - categoryId (path): Category ID

Body (all optional):
{
  "name": "DIOR_UPDATED",
  "description": "Updated description",
  "color": "#FF0000",
  "icon": "crown",
  "logo": <file>,
  "isActive": false
}

Response (200 OK):
{
  "category": {
    // Updated category object
  }
}
```

### 5. Delete Category
```http
DELETE /api/categories/:categoryId
Authorization: Bearer <token>

Parameters:
  - categoryId (path): Category ID

Response (200 OK):
{
  "message": "Category deleted successfully"
}

Response (400 Bad Request) - if racks using this category:
{
  "error": "Cannot delete category with racks still assigned to it"
}
```

---

## 🎯 Rack Endpoints (Updated)

### 1. Create Rack with Category
```http
POST /api/racks/
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "code": "A1",                      // Required: Rack code
  "categoryId": "cat-456",           // Optional: Category ID
  "rackType": "STORAGE",             // Optional: STORAGE|MATERIALS|EQUIPMENT
  "location": "Warehouse A",         // Optional
  "capacityTotal": 100,              // Optional: Default 100
  "length": 2.5,                     // Optional: Dimensions
  "width": 1.5,
  "height": 1.8,
  "dimensionUnit": "METERS"          // Optional: METERS|FEET|INCHES
}

Response (201 Created):
{
  "rack": {
    "id": "rack-1",
    "code": "A1",
    "categoryId": "cat-456",
    "category": {
      "id": "cat-456",
      "name": "DIOR",
      "logo": "/uploads/categories/cat-456-logo.png",
      "color": "#FF5733",
      "icon": "diamond"
    },
    "rackType": "STORAGE",
    "location": "Warehouse A",
    "length": 2.5,
    "width": 1.5,
    "height": 1.8,
    "dimensionUnit": "METERS",
    "capacityTotal": 100,
    "capacityUsed": 0,
    "status": "ACTIVE",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Get All Racks
```http
GET /api/racks/
Authorization: Bearer <token>

Query Parameters:
  - status: ACTIVE|FULL|MAINTENANCE
  - search: Search by code
  - section: Filter by section

Response (200 OK):
{
  "racks": [
    {
      "id": "rack-1",
      "code": "A1",
      "category": {
        "id": "cat-456",
        "name": "DIOR",
        "logo": "/uploads/categories/cat-456-logo.png",
        "color": "#FF5733",
        "icon": "diamond"
      },
      "length": 2.5,
      "width": 1.5,
      "height": 1.8,
      "dimensionUnit": "METERS",
      "capacityTotal": 100,
      "capacityUsed": 45,
      "utilization": 45,
      "status": "ACTIVE"
      // ... other fields
    }
  ]
}
```

### 3. Get Single Rack
```http
GET /api/racks/:id
Authorization: Bearer <token>

Response (200 OK):
{
  "rack": {
    "id": "rack-1",
    "code": "A1",
    "category": {
      "id": "cat-456",
      "name": "DIOR",
      "logo": "/uploads/categories/cat-456-logo.png",
      "color": "#FF5733",
      "icon": "diamond"
    },
    "length": 2.5,
    "width": 1.5,
    "height": 1.8,
    "dimensionUnit": "METERS",
    // ... full details with boxes, activities
  }
}
```

### 4. Update Rack
```http
PUT /api/racks/:id
Content-Type: application/json
Authorization: Bearer <token>

Body (all optional):
{
  "categoryId": "cat-789",  // Change category
  "code": "A1-NEW",
  "location": "Warehouse B",
  "length": 3.0,
  "width": 2.0,
  "height": 2.0,
  "dimensionUnit": "FEET"
}

Response (200 OK):
{
  "rack": {
    // Updated rack with new category details
  }
}
```

### 5. Delete Rack
```http
DELETE /api/racks/:id
Authorization: Bearer <token>

Response (200 OK):
{
  "message": "Rack deleted successfully"
}

Response (400 Bad Request) - if boxes stored:
{
  "error": "Cannot delete rack with boxes in storage"
}
```

---

## 🎯 Company Endpoints (Extended)

### Company Model Now Includes:
```json
{
  "id": "company-123",
  "name": "My Company",
  "email": "info@company.com",
  "phone": "123-456-7890",
  
  // NEW FIELDS:
  "contactPerson": "John Doe",           // Main contact
  "contactPhone": "098-765-4321",        // Contact number
  "contractStatus": "ACTIVE",            // ACTIVE|INACTIVE|EXPIRED
  "contractDocument": "/uploads/contracts/contract-123.pdf",
  
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  
  // RELATIONS:
  "categories": [
    {
      "id": "cat-456",
      "name": "DIOR",
      // ... category details
    }
  ]
}
```

---

## 📊 Database Schema Reference

### Category Model
```sql
CREATE TABLE categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT,
  logo VARCHAR(255),           -- File path
  color VARCHAR(7),            -- Hex code like #FF5733
  icon VARCHAR(255),
  companyId VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_name_per_company (name, companyId)
);
```

### Rack Model (Updated)
```sql
ALTER TABLE racks
DROP COLUMN category,
ADD COLUMN categoryId VARCHAR(255),
ADD COLUMN length FLOAT,
ADD COLUMN width FLOAT,
ADD COLUMN height FLOAT,
ADD COLUMN dimensionUnit VARCHAR(20) DEFAULT 'METERS',
ADD FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL;
```

### Company Model (Extended)
```sql
ALTER TABLE companies
ADD COLUMN contactPerson VARCHAR(255),
ADD COLUMN contactPhone VARCHAR(20),
ADD COLUMN contractStatus VARCHAR(50),
ADD COLUMN contractDocument VARCHAR(255);
```

---

## 🔐 Authentication

All endpoints require authentication header:
```http
Authorization: Bearer <jwt-token>
```

**Token Types:**
- Valid JWT from login
- Includes: user ID, company ID, role
- Required for all category, rack, company endpoints

---

## 📝 Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": [...]
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Category not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## 🧪 Testing Examples

### Create Category (cURL)
```bash
curl -X POST http://localhost:5000/api/categories/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "companyId=company-123" \
  -F "name=DIOR" \
  -F "color=#FF5733" \
  -F "logo=@/path/to/logo.png"
```

### List Categories (cURL)
```bash
curl http://localhost:5000/api/categories/company-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Rack with Category (cURL)
```bash
curl -X POST http://localhost:5000/api/racks/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "A1",
    "categoryId": "cat-456",
    "length": 2.5,
    "width": 1.5,
    "height": 1.8,
    "dimensionUnit": "METERS",
    "capacityTotal": 100
  }'
```

---

## 🚀 File Upload Details

### Logo Uploads
- **Path:** POST /api/categories/
- **Field:** logo (form-data)
- **Saved to:** uploads/categories/
- **Types:** PNG, JPG, JPEG
- **Max size:** 5MB (configurable)

### Contract Uploads
- **Path:** (Company endpoints - not yet implemented in frontend)
- **Field:** contractDocument (form-data)
- **Saved to:** uploads/contracts/
- **Types:** PDF, DOC, DOCX

---

## ✨ Key Features

✅ **Company Isolation:** Categories are company-specific  
✅ **File Uploads:** Logo support with Multer  
✅ **Validations:** CategoryId validated before use  
✅ **Relationships:** Proper FK with onDelete handling  
✅ **Error Handling:** Comprehensive error messages  
✅ **Authentication:** Role-based access control  
✅ **Dimensions:** Support for rack measurements  
✅ **Status:** Active/inactive tracking  

---

## 📍 Environment URLs

| Environment | Backend | Frontend | Database |
|-------------|---------|----------|----------|
| Local | http://localhost:5000 | http://localhost:5173 | localhost:3307 |
| Staging | http://148.230.107.155:5001 | http://148.230.107.155:8080 | 148.230.107.155:3308 |
| Production | https://qgocargo.cloud | https://qgocargo.cloud | 148.230.107.155:3307 |

---

## 🎯 Next: Frontend Integration

These APIs are ready to be consumed by frontend:
- Category CRUD components
- Rack management with category selector
- Company management with new fields
- File upload handling
- Form validation

**Status:** ✅ BACKEND READY FOR INTEGRATION


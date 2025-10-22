# Backend API Documentation

## Overview

The backend is built with:
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (default users and data)
npm run prisma:seed

# Start development server
npm run dev:server
```

## Environment Variables

Create a `.env` file:

```
DATABASE_URL="mysql://user:password@localhost:3306/qgo_cargo"
API_PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY=your-api-key
```

## API Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "uid": "user-123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "password": "securepassword",
  "role": "user"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "uid": "user-123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "user",
    "status": "active"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### Jobs Management

All job endpoints require authentication.

#### Get All Jobs
```http
GET /api/jobs?status=approved&skip=0&take=20
Authorization: Bearer {token}

Response:
{
  "jobs": [...],
  "total": 100,
  "skip": 0,
  "take": 20
}
```

Query Parameters:
- `status`: Filter by status (pending, checked, approved, rejected)
- `skip`: Pagination offset (default: 0)
- `take`: Items per page (default: 20)

#### Get Job by ID
```http
GET /api/jobs/{jobId}
Authorization: Bearer {token}
```

#### Create Job
```http
POST /api/jobs
Authorization: Bearer {token}
Content-Type: application/json

{
  "jfn": "QGO/A/001/24",
  "d": "2024-05-20",
  "sh": "Global Imports Co.",
  "co": "Kuwait Retailers",
  "charges": [
    {
      "l": "Freight",
      "c": "100",
      "s": "120",
      "n": ""
    }
  ],
  "totalCost": 100,
  "totalSelling": 120,
  "totalProfit": 20,
  ...
}
```

#### Update Job
```http
PUT /api/jobs/{jobId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "jfn": "QGO/A/001/24",
  "d": "2024-05-20",
  ...
}
```

#### Check Job (Checker Action)
```http
POST /api/jobs/{jobId}/check
Authorization: Bearer {token}

Response: Updated job with status="checked"
```

#### Approve Job (Admin Action)
```http
POST /api/jobs/{jobId}/approve
Authorization: Bearer {token}

Response: Updated job with status="approved"
```

#### Reject Job
```http
POST /api/jobs/{jobId}/reject
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Reason for rejection"
}

Response: Updated job with status="rejected"
```

#### Delete Job (Admin Only)
```http
DELETE /api/jobs/{jobId}
Authorization: Bearer {token}
```

### Users Management (Admin Only)

#### Get All Users
```http
GET /api/users
Authorization: Bearer {token}

Response:
[
  {
    "id": "...",
    "uid": "admin-1",
    "email": "admin@qgo.com",
    "displayName": "Admin User",
    "role": "admin",
    "status": "active",
    "createdAt": "2024-05-20T10:00:00Z"
  }
]
```

#### Create User
```http
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "uid": "user-new",
  "email": "newuser@example.com",
  "displayName": "New User",
  "password": "securepassword",
  "role": "user"
}
```

#### Update User
```http
PUT /api/users/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "displayName": "Updated Name",
  "role": "checker",
  "status": "active",
  "password": "newpassword" (optional)
}
```

#### Delete User
```http
DELETE /api/users/{userId}
Authorization: Bearer {token}
```

### Clients Management

#### Get All Clients
```http
GET /api/clients
Authorization: Bearer {token}

Response:
[
  {
    "id": "...",
    "name": "Global Imports Co.",
    "address": "123 Industrial Rd",
    "contactPerson": "John Smith",
    "phone": "555-1234",
    "type": "Shipper",
    "createdAt": "2024-05-20T10:00:00Z"
  }
]
```

#### Create Client
```http
POST /api/clients
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Client",
  "address": "123 Street",
  "contactPerson": "John Doe",
  "phone": "555-5678",
  "email": "contact@client.com",
  "type": "Shipper"
}
```

#### Update Client
```http
PUT /api/clients/{clientId}
Authorization: Bearer {token}
```

#### Delete Client
```http
DELETE /api/clients/{clientId}
Authorization: Bearer {token}
```

### Feedback

#### Get Feedback for Job
```http
GET /api/feedback/job/{jobId}
Authorization: Bearer {token}
```

#### Create Feedback
```http
POST /api/feedback
Authorization: Bearer {token}
Content-Type: application/json

{
  "jobFileId": "...",
  "rating": 5,
  "comments": "Great service!"
}
```

#### Update Feedback
```http
PUT /api/feedback/{feedbackId}
Authorization: Bearer {token}
```

### Settings

#### Get All Settings
```http
GET /api/settings
Authorization: Bearer {token}

Response:
{
  "general": {
    "companyName": "Q'GO CARGO",
    "companyLogoUrl": "...",
    "companyAddress": "..."
  },
  "jobFile": {...},
  "pod": {...},
  ...
}
```

#### Update Setting (Admin Only)
```http
PUT /api/settings/{key}
Authorization: Bearer {token}
Content-Type: application/json

{
  "value": {
    "companyName": "New Company Name",
    ...
  }
}
```

### Dashboard Statistics

#### Get Dashboard Summary
```http
GET /api/stats/dashboard/summary
Authorization: Bearer {token}

Response:
{
  "jobs": {
    "total": 100,
    "pending": 10,
    "checked": 20,
    "approved": 60,
    "rejected": 10
  },
  "totals": {
    "cost": 50000,
    "selling": 60000,
    "profit": 10000
  },
  "users": 5,
  "clients": 15
}
```

#### Get Jobs by Status
```http
GET /api/stats/jobs/by-status
Authorization: Bearer {token}

Response:
[
  { "status": "pending", "count": 10 },
  { "status": "checked", "count": 20 },
  { "status": "approved", "count": 60 },
  { "status": "rejected", "count": 10 }
]
```

#### Get Recent Activity
```http
GET /api/stats/activity/recent
Authorization: Bearer {token}

Response: Array of last 10 job updates
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Server Error

## Authentication

All protected endpoints require the `Authorization` header:

```
Authorization: Bearer {JWT_TOKEN}
```

Tokens are valid for 7 days (configurable via `JWT_EXPIRY`).

## Database Schema

See `prisma/schema.prisma` for complete database schema.

Key models:
- **User** - Application users with roles
- **JobFile** - Job records with workflow
- **Charge** - Charges associated with jobs
- **Client** - Customer information
- **Feedback** - User feedback on jobs
- **AppSetting** - Application configuration
- **CustomLink** - Custom URLs

## Role-Based Access Control

| Action | Admin | Checker | User | Driver |
|--------|-------|---------|------|--------|
| Create Job | ✓ | ✓ | ✓ | ✗ |
| Edit Job | ✓ | ✓ | ✓ | ✗ |
| Delete Job | ✓ | ✗ | ✗ | ✗ |
| Check Job | ✓ | ✓ | ✗ | ✗ |
| Approve Job | ✓ | ✗ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| Manage Clients | ✓ | ✓ | ✗ | ✗ |
| View Analytics | ✓ | ✓ | ✗ | ✗ |
| Manage Settings | ✓ | ✗ | ✗ | ✗ |

## Troubleshooting

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
- Ensure MySQL is running
- Check DATABASE_URL in .env
- Verify credentials are correct

### Prisma Migration Failed
```
npx prisma migrate status
npx prisma migrate resolve --rolled-back migration_name
```

### Token Invalid
- Ensure token format is correct: `Bearer {token}`
- Check if token has expired (7 days default)
- Verify JWT_SECRET matches

## Development

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Open Prisma Studio
```bash
npm run prisma:studio
# Visit http://localhost:5555
```

### Seed Database
```bash
npm run prisma:seed
```

### View Database
```bash
docker-compose exec mysql mysql -u root -p qgo_cargo
```

---

For deployment information, see [DEPLOYMENT.md](../DEPLOYMENT.md)

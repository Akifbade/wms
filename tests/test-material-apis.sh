#!/bin/bash
# Material Stock Management API Test

API_URL="http://localhost:5000/api"
TOKEN="your-jwt-token-here"

echo "Testing Material Stock Management APIs..."
echo "=========================================="

# Test 1: Get all materials
echo -e "\n1. GET /materials"
curl -X GET "$API_URL/materials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Test 2: Create new material
echo -e "\n\n2. POST /materials (Create)"
curl -X POST "$API_URL/materials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "BOX-001",
    "name": "Cardboard Box Large",
    "category": "BOX",
    "unit": "PCS",
    "minStockLevel": 10,
    "unitCost": 50,
    "sellingPrice": 75
  }'

# Test 3: Get available racks
echo -e "\n\n3. GET /materials/available-racks"
curl -X GET "$API_URL/materials/available-racks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Test 4: Issue materials to job
echo -e "\n\n4. POST /materials/issues (Allocate to Job)"
curl -X POST "$API_URL/materials/issues" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job-123",
    "materialId": "material-id",
    "quantity": 20,
    "rackId": "rack-id",
    "notes": "For moving job"
  }'

# Test 5: Record material return
echo -e "\n\n5. POST /materials/returns (Record Return)"
curl -X POST "$API_URL/materials/returns" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job-123",
    "materialId": "material-id",
    "quantityGood": 18,
    "quantityDamaged": 2,
    "rackId": "rack-id"
  }'

echo -e "\n\nAPI Tests Complete!"

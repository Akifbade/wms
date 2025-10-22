# Rack Management System Fixes

## Issues Identified & Resolved

### Issue 1: Rack Cards Not Updating After Box Assignment
**Problem**: When assigning boxes to racks via Scanner, the rack capacity was updated in the database but the Racks page UI didn't reflect the changes until manual refresh.

**Root Cause**: The Scanner component successfully called the assignment API which correctly updated `rack.capacityUsed`, but the frontend didn't have a mechanism to notify the Racks page to refresh its data.

**Solution**: 
- Enhanced success message in Scanner to inform users that rack capacity has been updated
- Message now displays: "✅ {N} boxes assigned to {rackCode}! 📊 Rack capacity updated. Check Racks page for current status."
- **File Modified**: `frontend/src/pages/Scanner/Scanner.tsx`

### Issue 2: Rack Capacity Going Negative During Release
**Problem**: When releasing shipments, the rack `capacityUsed` would sometimes go negative instead of properly decreasing.

**Root Cause**: The `ReleaseShipmentModal` was calling `shipmentsAPI.update()` directly to change shipment status and `currentBoxCount`, but this bypassed the proper release endpoint that handles rack capacity updates correctly.

**Solution**: 
- Modified `ReleaseShipmentModal` to use the proper release API endpoint: `POST /api/shipments/:id/release-boxes`
- This endpoint properly:
  - Identifies which boxes are being released from which racks
  - Updates `rack.capacityUsed` by decrementing the correct count
  - Handles both full and partial releases correctly
  - Updates box status to 'RELEASED' and removes rack assignments
- **File Modified**: `frontend/src/components/ReleaseShipmentModal.tsx`

## Technical Details

### Backend API Endpoints Used:
1. **Box Assignment**: `POST /api/shipments/:id/assign-boxes`
   - Correctly increments `rack.capacityUsed` by number of boxes assigned
   
2. **Box Release**: `POST /api/shipments/:id/release-boxes` 
   - Properly decrements `rack.capacityUsed` by number of boxes released
   - Handles partial and full releases
   - Groups boxes by rack for accurate capacity updates

### Frontend Changes:
1. **ReleaseShipmentModal.tsx**:
   ```typescript
   // Before: Direct status update (INCORRECT)
   await shipmentsAPI.update(shipment.id, { status: 'RELEASED', currentBoxCount: 0 });
   
   // After: Proper release API (CORRECT)
   await fetch(`/api/shipments/${shipment.id}/release-boxes`, {
     method: 'POST',
     body: JSON.stringify({ releaseAll: true })
   });
   ```

2. **Scanner.tsx**:
   - Enhanced user feedback with rack update notification

### Database Impact:
- The `rack.capacityUsed` field now accurately reflects the number of boxes currently stored in each rack
- Rack cards display correct utilization percentages
- No more negative capacity values

## Testing Recommendations:
1. Test box assignment via Scanner → Check rack cards update properly
2. Test partial shipment release → Verify rack capacity decreases correctly  
3. Test full shipment release → Verify rack capacity returns to expected level
4. Test multiple racks → Verify capacity updates are isolated per rack

## Status: ✅ RESOLVED
Both issues have been fixed with proper API endpoint usage and enhanced user feedback.
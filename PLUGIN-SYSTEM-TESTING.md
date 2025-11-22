# 🎯 PLUGIN SYSTEM - DEMO & TESTING GUIDE

Ab **plugin system fully functional** hai. Dekho kya-kya kar sakte ho practically:

---

## **QUICK START - TRY NOW!**

### **Step 1: Server start karo**
```bash
cd c:\Users\USER\Videos\NEW START
# Ek terminal me backend
cd backend
npm start

# Dusra terminal me frontend
cd frontend
npm run dev
```

### **Step 2: Admin login karo**
- URL: `http://localhost:3000/login`
- Email: Admin user ka email (ya create karo `/create-admin.sql` run karke)
- Role: **ADMIN** zaroori hai

### **Step 3: Patch Manager kholo**
- Dashboard me → **🔧 Patch Manager** link click karo
- Ya direct: `http://localhost:3000/patch-manager`

---

## **LIVE DEMO - TEST KARO ABHI**

### **Demo 1: Feature Toggle (Dashboard Analytics)**

**Current state:**
- `dashboard-safe-analytics` patch **ENABLED**
- Dashboard pe revenue chart aur shipment stats dikhta hai

**Test 1 - Disable feature:**
1. Patch Manager → `dashboard-safe-analytics` 
2. Power button click karo → **Disabled**
3. Dashboard ko refresh karo
4. **Result:** Analytics cards disappear, fallback message dikhta hai ✅

**Test 2 - Re-enable:**
1. Patch Manager → `dashboard-safe-analytics` power button again
2. Alert: "Server restart required"
3. Backend restart karo (or just refresh - may fallback dikhe)
4. **Result:** Analytics cards wapas aa jate hain ✅

---

### **Demo 2: Enable New Feature (Smart Shipment Alerts)**

**Current state:**
- `smart-shipment-alerts` patch **DISABLED**
- Naya API endpoint available nahi hai

**Test 1 - Enable the patch:**
1. Patch Manager → scroll down
2. Find `smart-shipment-alerts` (disabled)
3. Click power button → **Enabled**
4. Alert: "Restart server to apply changes"
5. Backend restart karo

**Test 2 - Use the new API:**
```bash
# Terminal me curl karo
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/alerts/shipment-status

# Result: Will show delayed shipments with alerts
{
  "alertCount": 5,
  "alerts": [
    {
      "shipmentId": "xyz",
      "referenceId": "REF-001",
      "alerts": [
        {
          "type": "LONG_PENDING",
          "message": "Shipment pending for 10 days",
          "severity": "HIGH"
        }
      ]
    }
  ]
}
```

**Test 3 - Disable if crashes:**
1. Agar error aaye to Patch Manager → power button
2. **Disabled** → instantly working again ✅

---

### **Demo 3: Check Patch Health**

**API Call:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/system-patches/status
```

**Response example:**
```json
{
  "patches": [
    {
      "id": "safe-headers",
      "enabled": true,
      "status": "ACTIVE",
      "description": "Adds protective headers...",
      "loadedAt": "2025-11-15T10:30:00Z"
    },
    {
      "id": "dashboard-safe-analytics",
      "enabled": true,
      "status": "ACTIVE",
      "description": "Feature flag for dashboard..."
    },
    {
      "id": "smart-shipment-alerts",
      "enabled": false,
      "status": "DISABLED",
      "description": "AI-powered alerts..."
    }
  ],
  "allHealthy": true
}
```

---

## **CREATE YOUR OWN PATCH - 5 MINUTES**

### **Example: New Shipment Notification Feature**

**Step 1: Create module file**
```bash
# File: backend/src/patches/modules/shipment-notifications.ts
```

```typescript
import type { PatchContext } from '../types';

export default {
  id: 'shipment-notifications',
  description: 'Real-time shipment status notifications',
  
  async apply(context: PatchContext) {
    const { app, prisma, logger } = context;
    
    logger.info('Shipment notifications patch loaded');
    
    // New endpoint
    app.post('/api/notify/shipment-update', async (req, res) => {
      const { shipmentId, status } = req.body;
      const userId = (req as any).user?.id;
      
      logger.info(`Shipment ${shipmentId} status changed to ${status}`);
      
      // Send notification (Slack, email, SMS, etc)
      // await notificationService.send({
      //   userId,
      //   message: `Shipment ${shipmentId} is now ${status}`
      // });
      
      res.json({ notified: true });
    });
  }
};
```

**Step 2: Add to config**
```json
{
  "patches": [
    // ... existing patches ...
    {
      "id": "shipment-notifications",
      "module": "shipment-notifications",
      "description": "Real-time shipment status notifications",
      "enabled": true,
      "appliesTo": ["backend"]
    }
  ]
}
```

**Step 3: Build aur restart**
```bash
npm run build
npm start
```

**Step 4: Test**
- Patch Manager → `shipment-notifications` ACTIVE dikhega
- API ready: `POST /api/notify/shipment-update`

**Done! ✅**

---

## **ADVANCED - MULTI-FEATURE ROLLOUT**

### **Scenario: Gradually enable for 20% users**

```typescript
// In your patch apply function:
app.get('/api/feature/advanced-dashboard', (req, res) => {
  const userId = req.user.id;
  
  // Deterministic rollout (same user always gets same result)
  const hash = userId.charCodeAt(0) % 100;
  const rolloutPercentage = 20; // 20% users
  
  if (hash < rolloutPercentage) {
    return res.json({ feature: 'enabled', data: getAdvancedDashboard() });
  } else {
    return res.json({ feature: 'disabled', data: getBasicDashboard() });
  }
});
```

**Then in config:**
```json
{
  "id": "advanced-dashboard",
  "rolloutPercentage": 20  // Day 1
}
// Day 2: update to 50
// Day 3: update to 100
```

---

## **MONITORING & TROUBLESHOOTING**

### **Issue: Patch failed to load**

**Check logs:**
```
❌ [Patch:my-feature] Failed to load: Cannot find module
```

**Fix:**
1. Check filename matches config `module` field
2. Export default object with `apply` function
3. Check TypeScript compilation

**Test:**
```bash
npm run build  # Should show compilation errors
```

---

### **Issue: Feature not showing in frontend**

**Check:**
1. Backend patch enabled? → Patch Manager ✅
2. Frontend guard added? → `usePatchEnabled('patch-id')` ✅
3. Browser cache cleared? → F12 → Ctrl+Shift+Delete ✅

**Debug:**
```typescript
// In component:
const isEnabled = usePatchEnabled('my-patch');
console.log('Patch enabled:', isEnabled);  // Check console
```

---

### **Issue: Can't enable - says "permission denied"**

**Check:**
- Logged in as ADMIN? → Settings → Check role ✅
- Token valid? → Refresh page ✅

---

## **REAL-WORLD CHECKLIST**

### **Before deploying patch to production:**

- [ ] Created patch module in `backend/src/patches/modules/`
- [ ] Added to `patches.config.json`
- [ ] Backend builds without errors: `npm run build`
- [ ] Started in disabled mode: `"enabled": false`
- [ ] Tested on staging/localhost first
- [ ] Error handling + logging added
- [ ] Fallback logic implemented (if API crashes)
- [ ] Created frontend guard if UI component
- [ ] Team reviewed code
- [ ] Ready for gradual rollout

### **Rollout strategy:**

1. **Day 1:** Disabled (deployed but off)
2. **Day 2:** Enable for 10% users
3. **Day 3:** Monitor metrics
4. **Day 4:** Enable for 50% if healthy
5. **Day 5:** Enable for 100% if stable

---

## **HELPFUL COMMANDS**

```bash
# Build backend
cd backend && npm run build

# Start backend
npm start

# Start frontend (dev)
cd frontend && npm run dev

# Check patch status API
curl http://localhost:5000/api/system-patches/status

# Toggle patch via API
curl -X POST http://localhost:5000/api/system-patches/toggle/my-patch \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## **KEY TAKEAWAYS** 

✅ **Plugin system = safe experimentation** - test naya code bina risk  
✅ **Admin UI = easy toggle** - coding skill zaroori nahi  
✅ **Instant rollback** - galti ho to ek click se fix  
✅ **Gradual rollouts** - 1% से 100% tak safely  
✅ **Monitoring** = health checks aur alerts  
✅ **Database access** = Prisma ke through full power  

---

**Ready to ship features confidently? Go try it! 🚀**

**Questions? Check:**
- `/PLUGIN-SYSTEM-GUIDE.md` - Detailed concepts
- `backend/patches.config.json` - Config reference
- `backend/src/patches/modules/*.ts` - Existing examples

# 🔧 Plugin System - Complete Guide (Henglish)

Ab tum **plugin system** se system-wide features ko safely manage kar sakte ho. Dekho kya-kya kar sakte ho:

---

## **1️⃣ FEATURE TOGGLING (Testing se production tak safe)**

```
Scenario: Naya dashboard chart banaya - risky ho sakta hai
Solution: Patch ban jao aur on/off toggle karo
```

**Example - Analytics Feature Flag:**

```typescript
// backend/src/patches/modules/revenue-charts.ts
export default {
  id: 'revenue-charts',
  description: 'New revenue chart feature',
  async apply({ app, logger }) {
    logger.info('Revenue charts loaded');
    // Naya chart ka code yahan hota
  }
};
```

**Config me add karo:**
```json
{
  "patches": [
    {
      "id": "revenue-charts",
      "enabled": true,  // False karo to feature off
      "description": "New revenue chart feature"
    }
  ]
}
```

**Frontend me guard lao:**
```typescript
import { usePatchEnabled } from '@/contexts/PatchContext';

export function RevenueChart() {
  const chartEnabled = usePatchEnabled('revenue-charts');
  
  if (!chartEnabled) {
    return <div>Feature coming soon...</div>;
  }
  
  return <ChartComponent />;
}
```

**Result:** Admin panel se toggle karo → feature on/off hota hai instantly ✅

---

## **2️⃣ SAFETY GUARDS & MIDDLEWARE (Security inject karo)**

```
Scenario: API pe rate limit add karna hai ya logs badhane ho
Solution: Patch me middleware add karo
```

**Example - Enhanced Security:**

```typescript
// backend/src/patches/modules/advanced-security.ts
import rateLimit from 'express-rate-limit';

export default {
  id: 'advanced-security',
  description: 'Extra rate limits and audit logs',
  async apply({ app, logger }) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    });
    
    app.use('/api/', limiter);
    logger.info('Rate limiting enabled');
  }
};
```

**Result:** Enable karo → automatically rate limits apply ho jate hain 🛡️

---

## **3️⃣ EXPERIMENTAL FEATURES (Beta testing)**

```
Scenario: New shipment tracking feature beta test karna hai
Solution: Patch banao aur sirf selected companies ko enable karo
```

**Example - Beta Feature with Conditions:**

```typescript
// backend/src/patches/modules/beta-tracking.ts
export default {
  id: 'beta-tracking',
  description: 'Beta shipment tracking (testing)',
  async apply({ app, prisma, logger, config }) {
    // Sirf admin users ko enable karo
    app.get('/api/shipments/:id/beta-track', async (req, res) => {
      const user = req.user;
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Beta feature - admin only' });
      }
      
      // Beta logic yahan
      logger.info('Beta tracking accessed by admin');
      res.json({ betaData: 'live tracking...' });
    });
  }
};
```

**Frontend me:**
```typescript
const isBetaEnabled = usePatchEnabled('beta-tracking');

if (isBetaEnabled && userRole === 'ADMIN') {
  return <BetaTrackingPanel />;
}
```

**Result:** Sirf specific users ko test karna → stable hone pe sabko open karo ✅

---

## **4️⃣ GRADUAL ROLLOUTS (Slow deployment)**

```
Scenario: Naya feature 10% users ko enable karna, phir 50%, phir sab
Solution: Patch me percentage logic add karo
```

**Example - Gradual Rollout:**

```typescript
// backend/src/patches/modules/gradual-feature.ts
export default {
  id: 'gradual-feature',
  description: 'New feature rolling out gradually',
  async apply({ app, prisma, logger, config }) {
    app.get('/api/new-feature', async (req, res) => {
      const userId = req.user.id;
      
      // Hash user ID to get consistent % (same user always gets same result)
      const hash = userId.charCodeAt(0) % 100;
      const rolloutPercentage = 20; // 20% users ko enable
      
      if (hash < rolloutPercentage) {
        logger.info(`Feature enabled for user ${userId} (rollout ${rolloutPercentage}%)`);
        return res.json({ feature: 'enabled', data: {} });
      } else {
        logger.info(`Feature disabled for user ${userId}`);
        return res.json({ feature: 'disabled' });
      }
    });
  }
};
```

**Config me gradually update karo:**
```json
{
  "id": "gradual-feature",
  "rolloutPercentage": 10  // Day 1: 10%
}
// Day 2: update to 50%
// Day 3: update to 100%
```

**Result:** Safely deploy features without breaking system 🚀

---

## **5️⃣ SELF-HEALING & FALLBACKS (Automatic recovery)**

```
Scenario: Agar koi API crash ho raha hai to automatically fallback mode
Solution: Patch me health check + fallback logic
```

**Example - Self-Healing:**

```typescript
// backend/src/patches/modules/auto-healing.ts
export default {
  id: 'auto-healing',
  description: 'Monitors critical APIs and enables fallback',
  async apply({ app, logger }) {
    let isHealthy = true;
    
    // Health check endpoint
    app.get('/health/analytics', async (req, res) => {
      try {
        // Try main logic
        const data = await expensiveAnalyticsQuery();
        isHealthy = true;
        res.json(data);
      } catch (error) {
        isHealthy = false;
        logger.error('Analytics crashed, using fallback');
        
        // Fallback data - cached ya simplified
        res.json({
          fallback: true,
          message: 'Analytics temporarily unavailable',
          cachedData: await getCachedAnalytics()
        });
      }
    });
    
    logger.info('Auto-healing enabled');
  }
};
```

**Frontend shows message:**
```typescript
const data = await fetch('/api/analytics');
if (data.fallback) {
  showWarning('Analytics in fallback mode - some data may be cached');
}
```

**Result:** Crash hone se pehle automatically fallback karta hai ✅

---

## **6️⃣ A/B TESTING (Compare two versions)**

```
Scenario: UI redesign karni hai - pehle A/B test karo
Solution: Patch me logic split karo
```

**Example - A/B Test:**

```typescript
// backend/src/patches/modules/dashboard-ab-test.ts
export default {
  id: 'dashboard-ab-test',
  description: 'A/B testing for new dashboard',
  async apply({ app, logger }) {
    app.get('/api/dashboard/variant', (req, res) => {
      const userId = req.user.id;
      
      // 50% ko variant A, 50% ko variant B
      const variant = (parseInt(userId.substring(0, 2), 16) % 2) === 0 ? 'A' : 'B';
      
      logger.info(`User assigned to variant ${variant}`);
      res.json({ 
        variant,
        data: variant === 'A' ? getOldDashboard() : getNewDashboard()
      });
    });
  }
};
```

**Frontend:**
```typescript
const [variant, setVariant] = useState(null);

useEffect(() => {
  const response = await fetch('/api/dashboard/variant');
  const { variant } = await response.json();
  setVariant(variant);
}, []);

if (variant === 'A') return <OldDashboard />;
if (variant === 'B') return <NewDashboard />;
```

**Result:** Compare metrics between A aur B → best wala rollout karo 📊

---

## **7️⃣ SCHEDULED PATCHES (Time-based activation)**

```
Scenario: Maintenance ke baad feature enable karna hai automatically
Solution: Patch me cron/scheduler logic
```

**Example - Scheduled Enable:**

```typescript
// backend/src/patches/modules/scheduled-feature.ts
export default {
  id: 'scheduled-feature',
  description: 'Feature that enables at specific time',
  async apply({ app, logger }) {
    // Check every minute
    setInterval(() => {
      const now = new Date().getHours();
      
      // Enable feature 2 PM to 10 PM
      if (now >= 14 && now < 22) {
        // Feature enabled
        logger.info('Feature enabled (time-based)');
      } else {
        // Feature disabled
        logger.info('Feature disabled (outside hours)');
      }
    }, 60000); // Check every minute
  }
};
```

**Config:**
```json
{
  "id": "scheduled-feature",
  "activeHours": "14:00-22:00"
}
```

**Result:** Automatically activate/deactivate at specific times ⏰

---

## **8️⃣ PER-COMPANY FEATURES (Multi-tenant logic)**

```
Scenario: Premium companies ko advanced features dene ho
Solution: Patch me company check add karo
```

**Example - Premium Feature:**

```typescript
// backend/src/patches/modules/premium-features.ts
export default {
  id: 'premium-features',
  description: 'Advanced features for premium companies',
  async apply({ app, prisma, logger }) {
    app.get('/api/advanced-analytics', async (req, res) => {
      const companyId = req.user.companyId;
      
      // Check if company has premium plan
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { plan: true }
      });
      
      if (company?.plan === 'PREMIUM') {
        logger.info(`Premium analytics for company ${companyId}`);
        return res.json({ analytics: 'advanced' });
      } else {
        logger.warn(`Free plan - limited analytics`);
        return res.json({ analytics: 'basic' });
      }
    });
  }
};
```

**Result:** Different features for different subscription levels 💎

---

## **HOW TO CREATE A PLUGIN (Step by step)**

### **Step 1: Backend patch banao**
```bash
# File: backend/src/patches/modules/my-feature.ts
```

```typescript
import type { PatchModuleContext } from '../types';

export default {
  id: 'my-feature',
  description: 'My new feature',
  async apply(context: PatchModuleContext) {
    const { app, prisma, logger, config } = context;
    
    logger.info('My feature loaded');
    
    // Add routes, middleware, hooks, etc.
    app.get('/api/my-feature', (req, res) => {
      res.json({ status: 'working' });
    });
  }
};
```

### **Step 2: Config me add karo**
```json
{
  "patches": [
    {
      "id": "my-feature",
      "enabled": true,
      "description": "My new feature",
      "module": "my-feature"
    }
  ]
}
```

### **Step 3: Frontend guard (optional)**
```typescript
const isEnabled = usePatchEnabled('my-feature');
if (isEnabled) {
  return <MyFeatureUI />;
}
```

### **Step 4: Deploy**
- Commit changes
- Push to GitHub
- Server automatically restarts (via CI/CD)
- Patch loads automatically ✅

---

## **ADMIN PANEL QUICK ACTIONS**

**Admin → Patch Manager → Click power button:**

| Action | Result |
|--------|--------|
| Enable | Feature immediately available (if no server restart needed) |
| Disable | Feature turns off instantly |
| View Status | See if patch is ACTIVE, FAILED, or DISABLED |
| See Errors | If patch crashed, error message dikhta hai |

---

## **REAL-WORLD EXAMPLES**

### Example 1: New QR format
```typescript
// Patch: qr-code-v2
// Config: { enabled: false }
// When ready: Admin enables → new format used
// If crashes: Admin disables → old format returns
```

### Example 2: Invoice calculation change
```typescript
// Patch: new-invoice-calc
// Config: { rolloutPercentage: 10 } (10% companies only)
// Monitor metrics...
// When stable: rolloutPercentage: 100 → all companies
```

### Example 3: Performance improvement
```typescript
// Patch: fast-dashboard
// Config: { enabled: true, bypassCache: false }
// A/B test → compare load times
// Winner: keep enabled for everyone
```

---

## **MONITORING & ROLLBACK**

**Agar kuch galat ho gaya:**

1. **Quick Rollback:**
   - Admin Panel → Click power button → Feature disabled
   - Instant effect (if no DB changes)

2. **If DB data corrupted:**
   - Revert to backup
   - Re-enable patch after fix

3. **Monitor Health:**
   ```bash
   curl http://localhost:5000/api/system-patches/status
   ```

---

## **SUMMARY - KYA MILEGA**

✅ **Safe feature deployment** - tukda-tukda roll out karo  
✅ **Instant rollback** - galti ho to ek click se fix  
✅ **A/B testing** - dono versions compare karo  
✅ **Per-user/company control** - targeted rollouts  
✅ **Self-healing** - automatic fallbacks  
✅ **Gradual adoption** - 1% → 10% → 50% → 100%  
✅ **Admin UI** - coding nahi, sirf click karo  

**Ab WMS me koi bhi feature safely test aur deploy kar sakte ho! 🚀**

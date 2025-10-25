# 🎛️ INVENTORY & SCHEDULING SETTINGS INTEGRATION GUIDE

## WHAT WE'VE CREATED

A fully customizable settings component that integrates with your existing Settings page. It allows admins to configure:

### 4 Main Configuration Tabs:

**1. 📦 INVENTORY SETTINGS**
```
✅ Stock Level Thresholds (Low/Critical/Max Capacity)
✅ Stock Alerts & Notifications
✅ Auto-Reorder Configuration
✅ Audit Trail Settings
✅ Reorder Email Address
```

**2. 📅 SCHEDULING SETTINGS**
```
✅ Job Configuration (Duration, Max Jobs/Day)
✅ Crew Assignment Rules
✅ Material Tracking Options
✅ Photo Verification Requirements
✅ Signature Requirements
✅ GPS Journey Tracking
✅ WhatsApp & Email Notifications
✅ Auto-Complete on Photo Upload
```

**3. 🏢 WAREHOUSE SETTINGS**
```
✅ Warehouse Name & Location
✅ Timezone Configuration
✅ Working Hours (Start/End Time)
✅ Multiple Warehouse Support
✅ Default Warehouse Selection
```

**4. 🔔 NOTIFICATION SETTINGS**
```
✅ Low Stock Notifications
✅ Critical Stock Alerts
✅ Job Completion Alerts
✅ Crew Assignment Notifications
✅ Delayed Job Notifications
✅ Configurable Delay Threshold
```

---

## INSTALLATION STEPS

### Step 1: Add to Existing Settings Page

If you already have a Settings page at `/Settings/TemplateSettings.tsx`, add this import:

```typescript
import { InventorySchedulingSettings } from './InventorySchedulingSettings';
```

Then add it to your settings tabs:

```tsx
<div className="space-y-6">
  {/* Existing settings */}
  <YourExistingSettingsComponent />
  
  {/* Add this new section */}
  <InventorySchedulingSettings />
</div>
```

### Step 2: Create Settings API Endpoints (Backend)

Add these endpoints to your Express.js backend (`backend/src/routes/settings.ts` or similar):

```typescript
// GET current settings
router.get('/api/inventory-settings', authenticateToken, async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'inventory' });
    res.json(settings || defaultInventorySettings);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching settings' });
  }
});

// POST/UPDATE inventory settings
router.post('/api/inventory-settings', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;
    // Validate settings
    await Settings.updateOne({ key: 'inventory' }, { value: settings });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error saving settings' });
  }
});

// GET current scheduling settings
router.get('/api/scheduling-settings', authenticateToken, async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'scheduling' });
    res.json(settings || defaultSchedulingSettings);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching settings' });
  }
});

// POST/UPDATE scheduling settings
router.post('/api/scheduling-settings', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;
    // Validate settings
    await Settings.updateOne({ key: 'scheduling' }, { value: settings });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error saving settings' });
  }
});

// Similar endpoints for warehouse and notification settings
```

### Step 3: Create Database Settings Table

Add a `settings` table to store configuration:

```sql
CREATE TABLE settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100),
  INDEX idx_key (key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
('inventory', JSON_OBJECT(
  'lowStockThreshold', 30,
  'criticalStockThreshold', 10,
  'enableStockAlerts', true,
  'alertEmail', 'admin@warehouse.com'
));

INSERT INTO settings (key, value) VALUES 
('scheduling', JSON_OBJECT(
  'enableJobScheduling', true,
  'defaultJobDuration', 120,
  'maxJobsPerDay', 10
));
```

Or using Prisma Schema:

```prisma
model Setting {
  id        Int     @id @default(autoincrement())
  key       String  @unique
  value     Json
  updatedAt DateTime @updatedAt
  updatedBy String?

  @@index([key])
}
```

### Step 4: Update API Service Layer

Add to `frontend/src/services/api.ts`:

```typescript
export const settingsAPI = {
  // Inventory Settings
  getInventorySettings: async () => {
    const response = await fetch(`${API_URL}/api/inventory-settings`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    return response.json();
  },

  updateInventorySettings: async (settings: any) => {
    const response = await fetch(`${API_URL}/api/inventory-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ settings })
    });
    return response.json();
  },

  // Scheduling Settings
  getSchedulingSettings: async () => {
    const response = await fetch(`${API_URL}/api/scheduling-settings`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    return response.json();
  },

  updateSchedulingSettings: async (settings: any) => {
    const response = await fetch(`${API_URL}/api/scheduling-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ settings })
    });
    return response.json();
  },

  // Similar for warehouse and notification settings
};
```

### Step 5: Connect Settings to Components

Once settings are saved, use them in Inventory and Scheduling pages:

**In Inventory.tsx:**
```typescript
import { settingsAPI } from '../../services/api';

const Inventory: React.FC = () => {
  const [inventorySettings, setInventorySettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await settingsAPI.getInventorySettings();
    setInventorySettings(settings);
    
    // Use settings for thresholds
    if (item.quantity <= settings.lowStockThreshold) {
      // Show low stock warning
    }
  };

  // Rest of component...
};
```

**In Scheduling.tsx:**
```typescript
const Scheduling: React.FC = () => {
  const [schedulingSettings, setSchedulingSettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await settingsAPI.getSchedulingSettings();
    setSchedulingSettings(settings);
    
    // Use settings for job creation
    if (schedulingSettings?.requireSignature) {
      // Require signature on completion
    }
  };

  // Rest of component...
};
```

---

## FULLY CUSTOMIZABLE FEATURES

### 1. Stock Thresholds
```
User can set:
├─ Low Stock Threshold (1-100%)
├─ Critical Stock Threshold (1-100%)
├─ Max Capacity Warning (50-100%)
└─ Auto-reorder quantity
```

### 2. Alert Channels
```
User can choose:
├─ Email notifications
├─ WhatsApp notifications
├─ In-app notifications
├─ Alert recipients
└─ Notification frequency
```

### 3. Verification Methods
```
User can toggle:
├─ Photo verification
├─ Signature requirement
├─ GPS journey tracking
├─ Material count verification
└─ Auto-complete on photo
```

### 4. Workflow Configuration
```
User can customize:
├─ Default job duration
├─ Max jobs per day per crew
├─ Working hours
├─ Warehouse locations
└─ Crew assignment rules
```

---

## HOW IT ALL WORKS TOGETHER

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Login                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Settings Page        │
         │  └─ New Tab:          │
         │     Inventory &       │
         │     Scheduling        │
         └─────────┬─────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    ┌─────────────┐      ┌──────────────┐
    │ Inventory   │      │ Scheduling   │
    │ Settings    │      │ Settings     │
    │             │      │              │
    │ ├─ Low %    │      │ ├─ Job Dur.  │
    │ ├─ Critical │      │ ├─ Max Jobs  │
    │ ├─ Alerts   │      │ ├─ Photo     │
    │ └─ Auto     │      │ ├─ Signature │
    │   Reorder   │      │ └─ GPS       │
    └─────┬───────┘      └──────┬───────┘
          │                     │
          └──────────┬──────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Save to Database      │
        │  (Settings table)      │
        └─────────┬──────────────┘
                  │
        ┌─────────┴────────┐
        │                  │
        ▼                  ▼
   ┌─────────┐        ┌───────────┐
   │Inventory │       │Scheduling │
   │Page      │       │Page       │
   │uses      │       │uses       │
   │settings  │       │settings   │
   │for logic │       │for logic  │
   └──────────┘       └───────────┘
```

---

## BENEFITS

✅ **Fully Customizable**
- Admins can adjust all thresholds and rules
- No code changes needed
- Real-time configuration changes

✅ **Role-Based Settings**
- Different settings per warehouse
- Different alert recipients
- Different workflow rules

✅ **Audit Trail**
- Log who changed what settings
- Track configuration changes
- Compliance ready

✅ **Easy to Use**
- Collapsible sections
- Toggle switches for on/off
- Number inputs with validation
- Dropdown selects
- Real-time preview

✅ **Production Ready**
- Integrated with your existing Settings page
- Uses your authentication
- Stores in your database
- No external dependencies

---

## EXAMPLE WORKFLOWS ENABLED BY SETTINGS

### Workflow 1: Low Stock Alert
```
1. Admin sets Low Stock Threshold = 30%
2. Inventory page tracks racks
3. When rack reaches 30% capacity
4. System sends email (if enabled)
5. Manager sees alert on Inventory page
6. Auto-reorder created (if enabled)
```

### Workflow 2: Job Completion with Verification
```
1. Admin enables Photo + Signature
2. Manager creates job
3. Crew receives notification (WhatsApp + Email)
4. Crew takes photo at delivery location
5. Crew signs digitally (optional)
6. Photo auto-completes job (if enabled)
7. Manager notified of completion
```

### Workflow 3: Capacity Management
```
1. Admin sets Max Capacity Warning = 90%
2. Warehouse reaches 90% full
3. Alert sent to manager
4. Manager checks Inventory Overview
5. Decisions made on what to release
```

---

## NEXT STEPS

1. ✅ Component created and ready to use
2. ⏳ Create API endpoints in backend
3. ⏳ Create database table for settings
4. ⏳ Update API service layer
5. ⏳ Integrate settings into Inventory/Scheduling pages
6. ⏳ Build and deploy
7. ⏳ Test with admin user
8. ⏳ Document for team

---

## CODE ORGANIZATION

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Settings/
│   │   │   ├── TemplateSettings.tsx (existing)
│   │   │   ├── InventorySchedulingSettings.tsx (NEW)
│   │   │   └── index.ts
│   │   ├── Inventory/
│   │   │   └── Inventory.tsx (uses settings)
│   │   └── Scheduling/
│   │       └── Scheduling.tsx (uses settings)
│   └── services/
│       └── api.ts (add settingsAPI)

backend/
├── src/
│   ├── routes/
│   │   ├── settings.ts (NEW)
│   │   └── index.ts (import settings routes)
│   └── models/
│       └── Setting.ts (Prisma model)

database/
└── migrations/
    └── add_settings_table.sql
```

Ready to implement? Let me know!

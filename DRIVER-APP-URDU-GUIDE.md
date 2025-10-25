# Driver App - آسان گائیڈ (Urdu Guide)

## 📱 Driver App کیا ہے؟

یہ ایک موبائل ایپ ہے جو ڈرائیورز کے لیے بنائی گئی ہے:
- Trip شروع اور ختم کرنے کے لیے
- GPS location خودکار track کرنے کے لیے
- Fuel entries log کرنے کے لیے
- Trip history دیکھنے کے لیے
- Offline بھی کام کرتا ہے

---

## 🚀 شروعات کیسے کریں

### Step 1: App کھولیں
1. اپنے موبائل پر browser کھولیں (Chrome/Safari)
2. یہ لکھیں: **http://localhost:3000/driver**
3. اپنے username aur password se login کریں

### Step 2: App Install کریں (Optional)
**Android پر**:
1. Browser ke 3 dots par tap کریں
2. "Add to Home Screen" select کریں
3. "Install" par tap کریں
4. App icon آپ کی home screen پر آ جائے گا

**iPhone پر**:
1. Share button tap کریں
2. "Add to Home Screen" tap کریں
3. "Add" tap کریں

### Step 3: Location Permission دیں
جب puch‌e:
- ✅ "Location Access" allow کریں (ضروری ہے!)
- ✅ "Always" یا "While Using App" select کریں
- ⚠️ Location ke bina trip track nahi hoga!

---

## 📍 Trip کیسے شروع کریں

### 1. App کھولیں
- Driver app icon par tap کریں
- Zaroorat parne par login کریں

### 2. Vehicle چنیں
- "Trip" tab پر (پہلے سے selected ہوگا)
- Dropdown se apni vehicle چنیں
- Vehicle ka number plate dikh jaye ga

### 3. Trip شروع کریں
- **"Start Trip"** button par tap کریں
- GPS آپ کی location capture کرے گا
- Screen پر dikhay ga:
  - ⏱️ Trip ka time (چلتا رہے گا)
  - 📍 GPS coordinates
  - 🎯 Accuracy (meters mein)
  - 🚗 Speed (km/h mein)

### 4. GPS Auto-Tracking
- App har **30 seconds** mein location save کرتا ہے
- Background mein bhi kaam karta hai
- Screen lock hone par bhi tracking chalti hai
- Aap ko kuch nahi karna - bas gaadi chalayen!

---

## 🚗 Trip Chal Rahi Ho To

**Screen Par Dikhay Ga**:
- ⏱️ **Duration**: Kitni der se trip chal rahi hai (jese "2h 15m")
- 📍 **Location**: Abhi aap kahan hain (GPS coordinates)
- 🎯 **Accuracy**: GPS kitna sahi hai (kam number better hai)
- 🚗 **Speed**: Gaadi ki speed (har 30 sec update hoti hai)
- 📊 **GPS Points**: Kitne location points save hue hain

**Yaad Rakhein**:
- App ko background mein chalta rahne dein
- App ko force close na karein
- Phone charge rakhein (car charger use karein)
- Agar GPS signal nahi aata (tunnel mein), wapas aa jane par auto-start hoga
- Internet nahi hai? Koi masla nahi! Data phone mein save hoga aur baad mein bhej de ga

---

## 🛑 Trip کیسے ختم کریں

### 1. Gaadi Rok Dein
- Safely park karein
- Engine chalu rakhen (last GPS reading ke liye)

### 2. "End Trip" Par Tap Karein
- Ek form khul jaye ga

### 3. Details Bharein (Optional)
- **End Odometer**: Final meter reading
- **Notes**: Koi comment (jese "Delivery hogai", "Fuel chahiye")

### 4. Submit Karein
- **"End Trip"** button tap karein
- Final GPS location save hoga
- Trip complete!

### 5. Confirmation
- Success message dikh jaye ga
- Nayi trip ke liye screen reset hogi
- Sara data server par save hogaya

---

## ⛽ Fuel Entry Kaise Karein

### 1. Fuel Tab Par Jaayen
- Bottom mein "Fuel" icon par tap karein

### 2. Form Bharein
- **Vehicle**: Apni vehicle select karein
- **Liters**: Kitna fuel dala (jese 45.5)
- **Cost**: Kitne paise lage (jese 2500.00)
- **Odometer**: Meter reading (optional)
- **Location**: Kahan fuel dala (optional, jese "ABC Petrol Pump")
- **Receipt Photo**: Receipt ki photo (optional)
- **Notes**: Koi aur info (optional)

### 3. Submit Karein
- **"Log Fuel Entry"** button tap karein
- Entry save hojaye gi
- Admin reports mein dekh sake ga

---

## 📜 Purani Trips Kaise Dekhein

### 1. History Tab Par Jaayen
- Bottom mein "History" icon tap karein

### 2. Trips List Dekhein
- Aap ki sabhi trips dikhengi
- Details:
  - Trip ka date aur time
  - Konsi vehicle thi
  - Kitni der chali
  - Kitna distance
  - Status (Complete/Auto-Ended)

### 3. Details Dekhne Ke Liye
- Kisi bhi trip par tap karein
- Full details dikhengi

---

## 👤 Profile Tab

### 1. Profile Par Jaayen
- Bottom mein "Profile" icon tap karein

### 2. Apni Info Dekhein
- Naam
- Employee ID
- License number
- Contact details

### 3. Logout
- **"Logout"** button tap karein
- Kam khatam hone par logout zaroor karein

---

## 🔌 Offline Mode (Internet Nahi Hai)

### Kaise Kaam Karta Hai

App **internet ke bina bhi** kaam karta hai!

**Jab Internet Nahi**:
- ✅ Trip shuru kar sakte hain
- ✅ GPS points phone mein save ho rahe hain
- ✅ Trip khatam kar sakte hain
- ⚠️ Data abhi server par nahi, phone mein hai

**Jab Internet Wapas Aaye**:
- 🔄 App khud se sara data sync kar de ga
- 📤 GPS points server par chale jayenge
- ✅ Admin ko trips dikhengi
- 🎉 Koi data lost nahi hoga!

**Yaad Rakhein**:
- Offline ho to browser data delete na karein
- App installed rakhen
- Sync automatically hoga - kuch nahi karna

---

## ⚠️ Aam Masle Aur Hal

### Masla 1: GPS Kaam Nahi Kar Raha
**Problem**: "Waiting for GPS..." ya coordinates nahi aa rahe

**Hal**:
1. Location permission check karein:
   - Settings → Apps → Driver App → Permissions → Location → Always
2. GPS phone mein on hai?
3. Khule jagah mein jaayen (building ke andar GPS weak hota hai)
4. App band karke dubara kholen

### Masla 2: Trip Start Nahi Ho Rahi
**Problem**: Button kaam nahi kar raha

**Hal**:
1. Vehicle select ki hai?
2. Location permission di hai?
3. Internet connection check karein
4. Page refresh karein (F5)
5. Logout karke dubara login karein

### Masla 3: GPS Points Upload Nahi Ho Rahe
**Problem**: "GPS points queued" dikha raha hai

**Hal**:
1. Ye normal hai jab offline ho
2. Internet aane par auto-upload hoga
3. Internet connection check karein
4. App khol dein (sync trigger hoga)
5. Browser data delete na karein

### Masla 4: Background Mein Track Nahi Ho Raha
**Problem**: Screen lock hone par GPS ruk jata hai

**Hal**:
1. App ko khula rakhen driving ke dauran
2. Phone mount use karein aur screen on rakhen
3. Battery optimization off karein:
   - Settings → Battery → Battery Optimization → Browser → Don't Optimize

### Masla 5: Speed 0 km/h Dikha Raha Hai
**Problem**: Speed update nahi ho raha

**Hal**:
1. Ye normal hai jab gaadi ruki ho
2. Speed har 30 seconds mein update hoti hai
3. GPS ko speed calculate karne ke liye movement chahiye
4. Chalane ke baad 1 minute intezar karein

---

## 💡 Behtreen Tareeqe (Best Practices)

### Trip Shuru Karne Se Pehle
1. ✅ Phone ki battery check karein (kam ho to charge karein)
2. ✅ GPS on ho
3. ✅ GPS accuracy <20 meters tak wait karein
4. ✅ Sahi vehicle select karein
5. ✅ Parking se nikalte waqt trip start karein

### Trip Ke Dauran
1. ✅ App chalta rakhen (background mein chalega)
2. ✅ App force close na karein
3. ✅ Phone charged rakhen (car charger lagayen)
4. ✅ Agar app crash ho jaye, turant dobara kholen
5. ✅ Safely drive karein (chalate waqt phone use na karein!)

### Trip Khatam Hone Par
1. ✅ Pahunchte hi turant trip end karein
2. ✅ Notes zaroor likhen (delivery status, masle, etc.)
3. ✅ Final odometer reading note karein
4. ✅ Agar fuel dala ho to log karein
5. ✅ Shared device ho to logout karein

---

## 📝 Quick Reference (Jaldi Dekhne Ke Liye)

```
┌─────────────────────────────────┐
│   DRIVER APP - آسان گائیڈ       │
├─────────────────────────────────┤
│ 1. LOGIN کریں                   │
│    → Browser kholen             │
│    → /driver par jayen          │
│    → Username/Password dalein   │
│                                 │
│ 2. TRIP شروع کریں               │
│    → Vehicle select karein      │
│    → GPS lock ka wait karein    │
│    → "Start Trip" tap karein    │
│    → Safely drive karein!       │
│                                 │
│ 3. TRIP چل رہی ہو               │
│    → App chalta rakhen          │
│    → GPS har 30 sec log hota    │
│    → Offline mein bhi kaam kare │
│                                 │
│ 4. TRIP ختم کریں                │
│    → Safely park karein         │
│    → "End Trip" tap karein      │
│    → Notes likhen (optional)    │
│    → Submit karein              │
│                                 │
│ 5. FUEL لاگ کریں                │
│    → Fuel tab par jayen         │
│    → Form bharein               │
│    → Receipt upload karein      │
│    → Submit karein              │
│                                 │
│ 6. LOGOUT کریں                  │
│    → Profile tab kholen         │
│    → "Logout" tap karein        │
└─────────────────────────────────┘
```

---

## ✅ Sahi Kaam Kar Raha Hai Jab

**Trip Theek Se Chal Rahi Ho**:
- ✅ Green "Trip Active" indicator dikhe
- ✅ Timer chal raha ho (jese "0h 5m")
- ✅ GPS coordinates update ho rahe hon
- ✅ Accuracy 20 meters se kam ho
- ✅ Chalte waqt speed dikhe
- ✅ GPS points count barh raha ho

**Offline Sync Kaam Kar Raha Ho**:
- ✅ "Offline Mode" indicator dikhe
- ✅ "X GPS points queued" message
- ✅ Internet aane par data automatically sync ho
- ✅ Koi error message na aaye

---

## 🆘 Madad Chahiye?

**Rabta Karein**:
- Apne Fleet Manager se
- IT Support se
- Office phone karein

**Support Se Pehle**:
1. App restart kar ke dekhen
2. Internet check karein
3. Location permission verify karein
4. Error message ka screenshot len
5. Last action yaad rakhen jo problem se pehle kiya tha

---

**Khush Rahen! Safe Drive Karein! 🚗💨**

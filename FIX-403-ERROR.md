# ⚠️ 403 FORBIDDEN ERROR - FIX KARO

## Problem
Database reset hone ke baad, purana JWT token invalid ho gaya hai. Isliye 403 error aa raha hai.

---

## ✅ SOLUTION - YE KARO

### Step 1: Clear Browser Data
1. Browser me **F12** press karo (Developer Tools)
2. **Application** tab pe jao
3. **Local Storage** expand karo
4. **http://localhost:3000** pe click karo
5. **token** ko delete karo (right-click → Delete)

### Step 2: Fresh Login Karo
1. Browser refresh karo (**Ctrl + R**)
2. Login page pe jao
3. Ye credentials use karo:
   ```
   📧 Email:    admin@wms.com
   🔑 Password: admin123
   ```
4. Login button click karo

### Step 3: Materials Tab Test Karo
1. Sidebar me **Materials** pe click karo
2. **Categories** tab me jao
3. **Add Category** button click karo
4. Category add karo

---

## 🔧 Alternative Quick Fix

Agar upar ka method kaam na kare, to ye command run karo:

```powershell
# Browser band karo, phir ye command run karo:
cd "c:\Users\USER\Videos\NEW START"
npm run dev
```

Phir browser me:
1. **Ctrl + Shift + Delete** press karo
2. **Cached images and files** select karo
3. **Clear data** click karo
4. Browser close karo
5. Fresh browser window open karo
6. http://localhost:3000 pe jao
7. Login karo: `admin@wms.com` / `admin123`

---

## ✅ Ab Material Categories Save Hongi

Login karne ke baad:
1. Materials tab pe jao
2. Categories tab me:
   - ✅ Add Category button kaam karega
   - ✅ Categories save hongi
3. Materials tab me:
   - ✅ Add Material button kaam karega
   - ✅ Materials save hongi
4. Stock tab me:
   - ✅ Stock batches add kar sakte ho

---

## 🔐 Updated Features

Ab system automatically:
- ✅ 403 error detect karega
- ✅ Automatically logout karega
- ✅ Login page pe redirect karega
- ✅ "Session expired" message dikhayega

---

## 📝 Important Notes

### After Database Reset
Jab bhi database reset hota hai:
1. **Purane tokens invalid ho jate hain**
2. **Fresh login karna padta hai**
3. **Admin user phir se create karna padta hai** (already done)

### Admin Credentials (Yaad Rakho)
```
📧 Email:    admin@wms.com
🔑 Password: admin123
```

### Reset Admin Anytime
Agar bhool gaye to ye command run karo:
```powershell
cd "c:\Users\USER\Videos\NEW START\backend"
npx ts-node create-admin.ts
```

---

## 🚀 Final Testing Steps

Login karne ke baad:

### 1️⃣ Test Category Creation
- Materials → Categories tab
- Add Category: "Packing Materials"
- Should save successfully ✅

### 2️⃣ Test Child Category
- Add Category: "Boxes"
- Parent: Select "Packing Materials"
- Should save successfully ✅

### 3️⃣ Test Material Creation
- Materials → Materials tab
- Add Material with category
- Should save successfully ✅

### 4️⃣ Check Tree View
- Categories tab me tree view me hierarchy dikhni chahiye:
  ```
  📦 Packing Materials (0 materials)
    └─ 📦 Boxes (0 materials)
  ```

---

**Last Updated**: 2025-10-25
**Status**: ✅ FIXED - Login required for fresh token

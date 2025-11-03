# Login Page Customization Guide

## 🎨 New Settings Available

Your WMS now supports full login page customization! Admin can change colors, video backgrounds, and toggle features.

## 📍 How to Access Settings

1. **Login as Admin**: http://localhost (admin@demo.com / demo123)
2. **Go to Settings** → Company Settings
3. **Scroll to "Login Page Customization"** section

## ⚙️ Available Settings

### **1. Background Video**
- **Field**: `loginVideoUrl`
- **Default**: `https://cdn.pixabay.com/video/2024/03/08/203404-921381913_large.mp4`
- **Usage**: Enter any MP4 video URL
- **Recommendation**: Use warehouse/logistics videos from Pixabay or Pexels

**Example URLs:**
```
https://cdn.pixabay.com/video/2024/03/08/203404-921381913_large.mp4 (Warehouse automation)
https://cdn.pixabay.com/video/2023/06/15/167823-836765824_large.mp4 (Modern warehouse)
https://cdn.pixabay.com/video/2021/12/27/102633-661782396_large.mp4 (Logistics)
```

### **2. Video Enabled**
- **Field**: `loginVideoEnabled`
- **Type**: Boolean (ON/OFF)
- **Default**: `true`
- **Effect**: If OFF, shows gradient background instead

### **3. Glass Effect**
- **Field**: `loginGlassEffect`
- **Type**: Boolean (ON/OFF)
- **Default**: `true`
- **Effect**: Adds frosted glass blur effect to cards

### **4. Background Type**
- **Field**: `loginBackgroundType`
- **Options**: `video`, `gradient`, `image`
- **Default**: `video`

### **5. Background Image**
- **Field**: `loginBackgroundImage`
- **Type**: Image URL
- **Default**: `null`
- **Usage**: Only used when `loginBackgroundType = 'image'`

### **6. Show Features**
- **Field**: `loginShowFeatures`
- **Type**: Boolean (ON/OFF)
- **Default**: `true`
- **Effect**: Shows/hides the left feature showcase panel

## 🔧 How to Update via API

### **Update Settings (Admin Only)**

```bash
curl -X PUT http://localhost:5000/api/company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "loginVideoUrl": "https://your-video-url.mp4",
    "loginVideoEnabled": true,
    "loginGlassEffect": true,
    "loginBackgroundType": "video",
    "loginShowFeatures": true
  }'
```

### **Or Update via phpMyAdmin**

1. Open phpMyAdmin: http://localhost:8081
2. Select `warehouse_wms` database
3. Click `companies` table
4. Click "Edit" on your company row
5. Change these fields:
   - `loginVideoUrl`
   - `loginVideoEnabled`
   - `loginGlassEffect`
   - `loginBackgroundType`
   - `loginBackgroundImage`
   - `loginShowFeatures`
6. Click "Go"

## 🎯 Common Customization Scenarios

### **Scenario 1: No Video, Just Gradient**
```json
{
  "loginVideoEnabled": false,
  "loginGlassEffect": false,
  "loginShowFeatures": true
}
```

### **Scenario 2: Custom Video + No Features**
```json
{
  "loginVideoUrl": "https://your-custom-video.mp4",
  "loginVideoEnabled": true,
  "loginGlassEffect": true,
  "loginShowFeatures": false
}
```

### **Scenario 3: Static Image Background**
```json
{
  "loginBackgroundType": "image",
  "loginBackgroundImage": "https://your-image-url.jpg",
  "loginGlassEffect": true,
  "loginShowFeatures": true
}
```

### **Scenario 4: Minimal Login (No distractions)**
```json
{
  "loginVideoEnabled": false,
  "loginGlassEffect": false,
  "loginShowFeatures": false
}
```

## 📊 Database Schema

```sql
-- New columns in companies table
loginVideoUrl VARCHAR(500) DEFAULT 'https://cdn.pixabay.com/video/2024/03/08/203404-921381913_large.mp4'
loginVideoEnabled BOOLEAN DEFAULT TRUE
loginGlassEffect BOOLEAN DEFAULT TRUE
loginBackgroundType VARCHAR(50) DEFAULT 'video'
loginBackgroundImage VARCHAR(500)
loginShowFeatures BOOLEAN DEFAULT TRUE
```

## 🔄 Migration Commands

### **Localhost:**
```bash
docker exec -i wms-database mysql -uroot -prootpassword123 warehouse_wms < add-login-customization-fields.sql
```

### **Production VPS:**
```bash
ssh root@148.230.107.155
cd /root/NEW\ START
docker exec -i wms-database mysql -uroot -prootpassword123 warehouse_wms < add-login-customization-fields.sql
```

## ✅ Testing

1. Update settings via phpMyAdmin or API
2. Logout (or open incognito window)
3. Go to login page: http://localhost
4. Changes should reflect immediately (no cache)

## 🎨 Design Recommendations

### **For Professional Look:**
- Use warehouse/logistics videos
- Keep glass effect ON
- Show features panel (builds trust)
- Stick with blue color scheme

### **For Minimalist Look:**
- Disable video
- Disable features panel
- Disable glass effect
- Use solid gradient background

### **For Branding:**
- Use your company's promotional video
- Match primaryColor and secondaryColor to logo
- Add your company logo (already supported)
- Enable showCompanyName

## 📝 Notes

- **Video Format**: MP4 works best (H.264 codec)
- **Video Size**: Keep under 5MB for fast loading
- **Video Loop**: Automatically loops seamlessly
- **Video Muted**: Always muted (no sound)
- **Mobile**: Video may not autoplay on some mobile devices (falls back to gradient)
- **Caching**: Browser may cache video - use Ctrl+F5 to hard refresh

## 🚀 Free Video Resources

- **Pixabay**: https://pixabay.com/videos/search/warehouse/
- **Pexels**: https://www.pexels.com/search/videos/warehouse/
- **Coverr**: https://coverr.co/
- **Mixkit**: https://mixkit.co/free-stock-video/

---

**Current Version**: v2.1.137
**Last Updated**: November 3, 2025

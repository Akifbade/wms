# 🎨 Branding System - Complete Guide

## ✨ What's New

You can now fully customize your warehouse management system's appearance:

### Features Added
- ✅ **Company Logo Upload** - Upload your company logo (max 2MB)
- ✅ **Color Customization** - Set primary, secondary, and accent colors
- ✅ **Live Preview** - See changes before saving
- ✅ **Color Presets** - 4 beautiful pre-made color schemes
- ✅ **Beautiful Login Page** - Animated, modern login with your branding
- ✅ **Glass-morphism Effects** - Modern UI with backdrop blur
- ✅ **Show/Hide Password** - Toggle password visibility
- ✅ **Animated Backgrounds** - Dynamic gradient blobs using your colors

---

## 🚀 How to Use

### Step 1: Access Branding Settings
1. Login to your system: `https://72.60.215.188`
2. Go to **Settings** (gear icon in sidebar)
3. Click on **Branding & Appearance** (paint brush icon)

### Step 2: Customize Your Brand
1. **Company Name**
   - Enter your company name
   - Toggle "Show company name on login page" if you want it displayed

2. **Upload Logo**
   - Click "Choose File" or drag & drop your logo
   - Supported: PNG, JPG, JPEG, SVG, WEBP
   - Max size: 2MB
   - Logo will appear in live preview instantly

3. **Choose Colors**
   - **Primary Color** - Main brand color (buttons, links)
   - **Secondary Color** - Secondary accents (gradients, highlights)
   - **Accent Color** - Success states, special elements
   
   Two ways to set colors:
   - **Color Picker**: Click the color square to open picker
   - **Hex Input**: Type hex code directly (e.g., #4F46E5)

4. **Try Color Presets** (Optional)
   - Indigo Purple (Default)
   - Blue Cyan (Professional)
   - Green (Fresh)
   - Amber Red (Vibrant)
   
   Click any preset to instantly apply that color scheme!

5. **Preview Your Changes**
   - Live preview shows your logo, company name, and button with gradient
   - See exactly how it will look before saving

6. **Save**
   - Click the blue "Save Branding Settings" button
   - Success message will appear

### Step 3: See Your Branding Live
1. **Logout** from the system
2. Login page now shows:
   - Your uploaded logo (or default icon with your colors)
   - Your company name (if enabled)
   - Animated background blobs in your colors
   - Login button with gradient using your colors
   - Glass-morphism card effect

---

## 🎨 Color Presets

### Indigo Purple (Default)
- Primary: `#4F46E5` (Indigo)
- Secondary: `#7C3AED` (Purple)
- Accent: `#10B981` (Green)

### Blue Cyan
- Primary: `#0EA5E9` (Sky Blue)
- Secondary: `#06B6D4` (Cyan)
- Accent: `#F59E0B` (Amber)

### Green
- Primary: `#10B981` (Emerald)
- Secondary: `#14B8A6` (Teal)
- Accent: `#F59E0B` (Amber)

### Amber Red
- Primary: `#F59E0B` (Amber)
- Secondary: `#EF4444` (Red)
- Accent: `#10B981` (Green)

---

## 🔧 Technical Details

### Database Changes
New fields added to `companies` table:
- `primaryColor` - Primary brand color (default: #4F46E5)
- `secondaryColor` - Secondary brand color (default: #7C3AED)
- `accentColor` - Accent color (default: #10B981)
- `showCompanyName` - Show company name on login (default: true)

### API Endpoints
- **GET /api/company** - Returns company info including branding
- **PUT /api/company** - Updates company info including branding colors
- **POST /api/upload** - Handles logo file upload

### Frontend Components
- **BrandingSettings.tsx** - Settings page for branding configuration
- **Login.tsx** - Improved with dynamic branding support
- **Settings.tsx** - Added "Branding & Appearance" navigation item

### Animations
- **fade-in-down** - Logo and title entrance
- **fade-in-up** - Form entrance
- **shake** - Error message animation
- **blob** - Animated background gradient blobs

---

## 📱 Login Page Features

### Visual Elements
- ✅ Dynamic gradient background using your colors
- ✅ Animated floating blob elements
- ✅ Glass-morphism effect on login card
- ✅ Smooth fade-in animations
- ✅ Logo or gradient icon with your colors
- ✅ Company name display (if enabled)

### Functional Features
- ✅ Show/hide password toggle (eye icon)
- ✅ Remember me checkbox
- ✅ Animated error messages (shake effect)
- ✅ Loading state on submit button
- ✅ Smooth gradient button with hover effects

---

## 🧪 Testing Checklist

Use this checklist to verify everything works:

### Branding Settings Page
- [ ] Navigate to Settings → Branding & Appearance
- [ ] Page loads without errors
- [ ] All input fields are visible and functional

### Logo Upload
- [ ] Click "Choose File" button works
- [ ] Drag & drop file works
- [ ] Preview shows uploaded logo
- [ ] Error shown for files > 2MB
- [ ] Error shown for non-image files

### Color Customization
- [ ] Color pickers open and work
- [ ] Hex input accepts valid hex codes
- [ ] Invalid hex codes show error
- [ ] Live preview updates when colors change
- [ ] All 4 color presets work

### Save Functionality
- [ ] Click "Save Branding Settings" button
- [ ] Success message appears
- [ ] No console errors

### Login Page
- [ ] Logout from system
- [ ] Login page shows custom logo
- [ ] Background gradient uses custom colors
- [ ] Animated blobs use custom colors
- [ ] Login button gradient uses custom colors
- [ ] Show/hide password icon works
- [ ] All animations are smooth
- [ ] Glass-morphism effect visible on card
- [ ] Company name displays (if enabled)

### Mobile Responsive
- [ ] Branding settings work on mobile
- [ ] Login page looks good on mobile
- [ ] Color pickers work on touch devices
- [ ] File upload works on mobile

---

## 🐛 Troubleshooting

### Logo Not Showing
- **Check file size**: Max 2MB
- **Check file type**: Must be image (PNG, JPG, SVG, etc.)
- **Check browser console**: Look for upload errors
- **Try again**: Refresh page and re-upload

### Colors Not Changing
- **Check hex format**: Must be valid hex (e.g., #4F46E5)
- **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
- **Check save**: Make sure you clicked "Save" button
- **Logout/Login**: Changes only visible after logout

### Login Page Not Updating
- **Hard refresh**: Ctrl+Shift+R or Cmd+Shift+R
- **Clear cache**: Clear browser cache completely
- **Check backend**: Ensure backend is running (pm2 status)
- **Check database**: Verify colors saved in database

### Preview Not Working
- **Check browser**: Try Chrome/Edge/Firefox latest version
- **Check console**: Look for JavaScript errors
- **Refresh page**: Simple page refresh might help

---

## 💡 Tips & Best Practices

### Logo Guidelines
- **Format**: PNG with transparent background works best
- **Size**: Square logos work best (1:1 ratio)
- **Resolution**: At least 200x200 pixels
- **File size**: Keep under 500KB for fast loading

### Color Selection
- **Contrast**: Ensure text is readable on your colors
- **Brand consistency**: Match your existing brand colors
- **Accessibility**: Check color contrast ratios (WCAG AA)
- **Test combinations**: Try different color combinations

### Professional Look
1. Use your actual company logo
2. Match your website/business card colors
3. Keep it simple - don't use too many bright colors
4. Test on multiple devices before finalizing

---

## 🔐 Access Information

### System URL
```
https://72.60.215.188
```

### Admin Login
```
Email: admin@warehouse.com
Password: admin123
```

### Database Access (phpMyAdmin)
```
URL: https://72.60.215.188/phpmyadmin
Username: wms_user
Password: WmsSecure2024Pass
Database: wms_production
```

---

## 📝 Version History

### Version 1.0 (Current)
- Initial branding system release
- Logo upload functionality
- Color customization with presets
- Animated login page
- Glass-morphism UI effects
- Show/hide password toggle
- Live preview feature

---

## 🆘 Need Help?

If you encounter any issues:

1. **Check this guide** - Most questions answered here
2. **Check browser console** - F12 → Console tab
3. **Check backend logs** - `ssh root@72.60.215.188 "pm2 logs wms-backend"`
4. **Database check** - Use phpMyAdmin to verify data saved
5. **Restart services** - `ssh root@72.60.215.188 "pm2 restart wms-backend && systemctl restart nginx"`

---

## 🎯 What's Next?

Future enhancements being planned:
- [ ] Multiple logo upload (header logo, favicon, email logo)
- [ ] Font customization
- [ ] Custom CSS injection
- [ ] Dark mode support
- [ ] Multiple color themes
- [ ] Preview on different pages before saving

---

**Enjoy your newly branded warehouse management system! 🎨✨**

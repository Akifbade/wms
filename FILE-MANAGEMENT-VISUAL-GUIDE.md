# 📁 File Management System - Visual Guide

## New Features Overview

### 1. Folder Management Section (NEW!)
```
┌─────────────────────────────────────────────────────────────────┐
│ 📂 Folder                                    [+ New Folder]      │
│ ┌───────────────────────────────────────┐                       │
│ │ 📄 All Files (No Folder)        ▼    │                       │
│ │ 📁 Contracts                          │                       │
│ │ 📁 Photos                             │                       │
│ │ 📁 Invoices                           │                       │
│ └───────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

**Features**:
- Dropdown shows all available folders
- "All Files (No Folder)" option shows files without folder
- Green "New Folder" button opens creation modal
- Select folder before uploading to organize files

---

### 2. File Upload Area (ENHANCED!)
```
┌─────────────────────────────────────────────────────────────────┐
│                   ⬆️ Upload Icon                                 │
│                                                                  │
│          Drop files here or click to browse                     │
│                                                                  │
│   Supports: PDF, Images, Documents, Spreadsheets (Max 10MB)    │
│                                                                  │
│   📁 Files will be uploaded to: Contracts   ← Shows if folder   │
│                                               is selected        │
│                   [  Browse Files  ]                            │
└─────────────────────────────────────────────────────────────────┘
```

**Features**:
- Same drag-and-drop interface
- Shows target folder name (purple text) when folder is selected
- Uploads automatically go to selected folder
- Up to 10 files at once

---

### 3. Enhanced File List (NEW ICONS & PREVIEW!)
```
┌─────────────────────────────────────────────────────────────────┐
│ 🖼️  contract-signed.pdf                          [👁️] [⬇️] [🗑️] │
│     2.5 MB  •  Oct 27, 2025  •  📁 Contracts                    │
│                                                                  │
│ 📄  invoice-2024.pdf                             [👁️] [⬇️] [🗑️] │
│     1.8 MB  •  Oct 27, 2025  •  📁 Invoices                     │
│                                                                  │
│ 🖼️  site-photo-1.jpg                            [👁️] [⬇️] [🗑️] │
│     3.2 MB  •  Oct 27, 2025  •  📁 Photos                       │
│                                                                  │
│ 📝  notes.docx                                   [👁️] [⬇️] [🗑️] │
│     456 KB  •  Oct 27, 2025  •  📁 Documents                    │
└─────────────────────────────────────────────────────────────────┘
```

**File Icons**:
- 🖼️ = Image files (JPG, PNG, GIF)
- 📄 = PDF files
- 📝 = Word documents (DOC, DOCX)
- 📊 = Excel spreadsheets (XLS, XLSX)
- 📎 = Other files (TXT, ZIP)

**Action Buttons**:
- 👁️ [Preview] - Blue button - Opens preview modal
- ⬇️ [Download] - Green button - Download file directly
- 🗑️ [Delete] - Red button - Delete with confirmation

**File Info**:
- File name (clickable)
- File size (MB/KB)
- Upload date
- Folder badge (📁 FolderName) - Only if in a folder

---

### 4. New Folder Creation Modal (NEW!)
```
┌─────────────────────────────────────┐
│  📁 Create New Folder               │
│                                     │
│  ┌─────────────────────────────────┤
│  │ Enter folder name...            │
│  └─────────────────────────────────┤
│                                     │
│     [  Cancel  ]    [  Create  ]   │
└─────────────────────────────────────┘
```

**Features**:
- Opens when "New Folder" button clicked
- Input field for folder name
- Press Enter or click "Create" to create
- Cancel button closes modal
- After creation, new folder auto-selected in dropdown

---

### 5. File Preview Modal (NEW!)
```
┌──────────────────────────────────────────────────────────────┐
│ 📄 contract-signed.pdf      2.5 MB                      [✖️] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   FOR IMAGES:                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │         [  Full Image Preview Here  ]              │   │
│   │                                                     │   │
│   └────────────────────────────────────────────────────┘   │
│                                                              │
│   FOR PDFs:                                                  │
│   ┌────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │    [  PDF Embedded Viewer (iframe)  ]              │   │
│   │                                                     │   │
│   └────────────────────────────────────────────────────┘   │
│                                                              │
│   FOR OTHER FILES:                                           │
│   📎 Preview not available for this file type               │
│      [  ⬇️ Download File  ]                                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                          [⬇️ Download] [Close]              │
└──────────────────────────────────────────────────────────────┘
```

**Preview Support**:
- ✅ **Images** (JPG, PNG, GIF): Full image preview
- ✅ **PDFs**: Embedded PDF viewer (can scroll through pages)
- ⚠️ **Documents/Spreadsheets**: Shows download button only
- ⚠️ **ZIP files**: Shows download button only

**Modal Features**:
- Large modal (max-width: 4xl)
- Dark header showing file icon, name, size
- Close button (X) in top-right
- Download button in footer (green)
- Close button in footer (gray)

---

## User Flow Examples

### Example 1: Upload Files to Contracts Folder
```
1. Click "📁 Job Files & Documents" button
   ↓
2. Click "New Folder" button
   ↓
3. Type "Contracts" and press Enter
   ↓
4. Folder "Contracts" appears in dropdown (auto-selected)
   ↓
5. Drag-and-drop PDF files OR click "Browse Files"
   ↓
6. Upload message shows: "📁 Files will be uploaded to: Contracts"
   ↓
7. Files appear in list with "📁 Contracts" badge
```

### Example 2: Preview and Download Image
```
1. Find image file in list (🖼️ icon)
   ↓
2. Click blue "Preview" button (👁️ icon)
   ↓
3. Modal opens showing full image
   ↓
4. Click "Download" button in modal footer (or press Close)
   ↓
5. Image downloads to your computer
```

### Example 3: Organize Existing Files
```
1. Select "All Files (No Folder)" from dropdown
   ↓
2. See all files without folders
   ↓
3. Note: Currently cannot move files between folders
   ↓
4. Solution: Re-upload to correct folder, then delete old one
```

### Example 4: Filter Files by Folder
```
1. Open folder dropdown
   ↓
2. Select "Photos"
   ↓
3. File list shows ONLY files in "Photos" folder
   ↓
4. Footer shows: "5 file(s) in 'Photos'"
   ↓
5. Select "All Files (No Folder)" to see unfiled files
```

---

## Keyboard Shortcuts

- **New Folder Modal**: Press `Enter` to create folder
- **Preview Modal**: Press `Esc` to close (standard browser behavior)
- **File Upload**: Press `Ctrl+O` when focused on upload area

---

## Color Coding

**Purple** (`#9333EA`) - Primary actions:
- Main header gradient
- Folder badges
- Upload to folder message
- Focus rings on inputs
- Create/OK buttons

**Green** (`#059669`) - Create/Download actions:
- "New Folder" button
- Download button (list and modal)

**Blue** (`#2563EB`) - View/Preview actions:
- Preview button (Eye icon)

**Red** (`#DC2626`) - Delete actions:
- Delete button (Trash icon)

**Gray** - Cancel/Close actions:
- Cancel buttons
- Close buttons
- Disabled states

---

## File Count Display

### Footer Text Examples:
- `0 file(s)` - No files uploaded
- `3 file(s)` - 3 files, no folder selected
- `5 file(s) in "Contracts"` - 5 files filtered by "Contracts" folder
- `1 file(s) in "Photos"` - 1 file in "Photos" folder

---

## Empty States

### No Files Uploaded Yet:
```
       📎 (large gray icon)
    
    No files uploaded yet
    
  Upload your first document
     using the area above
```

### No Files in Selected Folder:
```
       📎 (large gray icon)
    
 No files in "Contracts" folder
    
  Upload documents to this folder
     using the area above
```

---

## Technical Details

### API Calls Made:
1. **On Modal Open**:
   - `GET /api/job-files/:jobId` - Load all files
   - `GET /api/job-files/:jobId/folders` - Load folder list

2. **On File Upload**:
   - `POST /api/job-files/upload` - Upload files
   - Then: Reload files and folders

3. **On File Delete**:
   - `DELETE /api/job-files/:fileId` - Delete file
   - Then: Reload files

4. **On Folder Create**:
   - `POST /api/job-files/folder` - Create folder
   - Then: Reload folders, select new folder

### Storage Location:
```
backend/uploads/job-files/
├── {jobId}/
│   ├── Contracts/
│   │   ├── {uuid}.pdf
│   │   └── {uuid}.pdf
│   ├── Photos/
│   │   ├── {uuid}.jpg
│   │   └── {uuid}.png
│   └── {uuid}.pdf  ← Files without folder
```

### File Naming:
- Original: `contract-signed.pdf`
- Stored as: `a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf`
- Database stores both original name and UUID filename

---

## Browser Compatibility

✅ **Fully Supported**:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

⚠️ **Partial Support** (Preview may not work):
- Internet Explorer (Not recommended)
- Older browsers (< 2020)

---

## Testing Checklist for User

### Basic Upload Tests:
- [ ] Upload 1 PDF file (no folder)
- [ ] Upload 3 image files at once
- [ ] Upload file larger than 10MB (should fail with error)
- [ ] Upload .exe file (should fail - not allowed)

### Folder Tests:
- [ ] Create "Contracts" folder
- [ ] Create "Photos" folder
- [ ] Create "Invoices" folder
- [ ] See all 3 folders in dropdown

### Organization Tests:
- [ ] Select "Contracts" folder
- [ ] Upload 2 PDF files
- [ ] Verify files show "📁 Contracts" badge
- [ ] Select "Photos" folder
- [ ] Upload 1 image file
- [ ] Verify file shows "📁 Photos" badge

### Preview Tests:
- [ ] Click Preview on image file → Should show full image
- [ ] Click Preview on PDF file → Should show PDF viewer
- [ ] Click Preview on Word file → Should show download button
- [ ] Close preview modal with X button
- [ ] Close preview modal with Close button

### Download Tests:
- [ ] Click Download (green icon) from file list
- [ ] Verify file downloads
- [ ] Click Download from preview modal
- [ ] Verify file downloads

### Delete Tests:
- [ ] Click Delete (red icon) on a file
- [ ] See confirmation dialog
- [ ] Click OK to confirm
- [ ] Verify file removed from list
- [ ] Click Delete on another file
- [ ] Click Cancel
- [ ] Verify file NOT removed

### Filter Tests:
- [ ] Select "All Files (No Folder)" → See unfiled files
- [ ] Select "Contracts" folder → See only Contracts files
- [ ] Select "Photos" folder → See only Photos files
- [ ] Verify footer shows correct count

### Edge Cases:
- [ ] Upload file with very long name (100+ characters)
- [ ] Create folder with special characters (!@#$%)
- [ ] Upload 10 files at once (maximum)
- [ ] Try to upload 11 files (should only take 10)

---

## Known Limitations

1. **Cannot Move Files**: Once uploaded to a folder, cannot move to another folder
   - Workaround: Re-upload to new folder, delete from old folder

2. **Cannot Rename Files**: Original filename is preserved, cannot be changed
   - Workaround: Delete and re-upload with new name

3. **Cannot Delete Folders**: Folders are auto-created from uploaded files
   - Workaround: Delete all files in folder, folder won't appear anymore

4. **No Bulk Delete**: Can only delete one file at a time
   - Workaround: Delete files one by one

5. **Preview Limited**: Only images and PDFs can be previewed
   - Other file types show download button only

---

## Urdu Instructions

### Files Upload Karne Ka Tarika:

1. **Folder Banaye** (optional):
   - "New Folder" button pe click kare (green color)
   - Folder ka naam likhe (jaise "Contracts")
   - Enter press kare ya "Create" button pe click kare

2. **Folder Select Kare**:
   - Dropdown se folder choose kare
   - Ya "All Files (No Folder)" rakhe agar folder nahi chahiye

3. **Files Upload Kare**:
   - Files ko drag karke upload area me drop kare
   - Ya "Browse Files" button pe click karke select kare
   - Upload hone tak wait kare

4. **Files Dekhe**:
   - Neeche list me saari files dikhengi
   - Har file ke saath:
     - Icon (type batata hai)
     - Naam aur size
     - Date
     - Folder badge (agar folder me hai)
     - Teen buttons (Preview, Download, Delete)

5. **File Preview Kare**:
   - Blue "Preview" button (👁️ icon) pe click kare
   - Images aur PDFs preview me khulenge
   - Baaki files download button dikhayenge

6. **File Download Kare**:
   - Green "Download" button (⬇️ icon) pe click kare
   - File download ho jayegi

7. **File Delete Kare**:
   - Red "Delete" button (🗑️ icon) pe click kare
   - Confirmation dialog me "OK" click kare
   - File delete ho jayegi

### Folders Se Files Filter Kare:

1. Dropdown kholo
2. Jis folder ki files dekhni hai, usko select karo
3. Sirf us folder ki files dikhengi
4. "All Files (No Folder)" select karo to jo files folder me nahi hai wo dikhengi

---

## Support & Troubleshooting

### Issue: Files not uploading
**Solution**:
1. Check file size (must be < 10MB)
2. Check file type (must be: PDF, images, DOC, XLS, TXT, ZIP)
3. Check internet connection
4. Try refreshing page

### Issue: Preview not working
**Solution**:
1. Only images and PDFs can be previewed
2. For other files, use Download button
3. Check browser (use Chrome/Firefox/Edge)

### Issue: Folder not appearing in dropdown
**Solution**:
1. Create folder using "New Folder" button
2. Upload at least one file to that folder
3. Refresh the modal (close and re-open)

### Issue: Cannot delete file
**Solution**:
1. Make sure you own the job
2. Check if file still exists (refresh page)
3. Try logging out and logging back in

---

**Created**: October 27, 2025  
**Status**: ✅ Implementation Complete - Pending Local Testing  
**Next Step**: User testing and approval for VPS deployment

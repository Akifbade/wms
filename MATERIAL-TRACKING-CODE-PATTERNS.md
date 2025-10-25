# Material Tracking - Implementation Code Patterns

## 🔧 Key Code Patterns from wh.html

### Pattern 1: Dynamic Material Row Addition

```javascript
const addMaterialRow = (material = { itemId: '', quantity: '' }) => {
  const container = document.getElementById('materials-list-container');
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 material-row relative';

  row.innerHTML = `
    <!-- SEARCH INPUT: User types item name -->
    <input type="text" 
           class="material-item-search w-1/2 border rounded-md p-2" 
           placeholder="Search for item..." 
           value="${material.itemName || ''}">
    
    <!-- HIDDEN ID: Stores selected itemId -->
    <input type="hidden" 
           class="material-item-id" 
           value="${material.itemId || ''}">
    
    <!-- SEARCH RESULTS: Dropdown with matching items -->
    <div class="material-search-results absolute top-full left-0 w-1/2 
                bg-white border shadow-lg max-h-40 overflow-y-auto z-10 hidden">
    </div>
    
    <!-- QUANTITY INPUT: Number of items -->
    <input type="number" 
           class="material-item-quantity w-1/4 border rounded-md p-2" 
           placeholder="Qty" 
           min="1" 
           value="${material.quantity}">
    
    <!-- DELETE BUTTON: Remove this row -->
    <button type="button" 
            class="remove-material-row-btn btn btn-danger !p-2">
      <i data-feather="trash-2"></i>
    </button>
  `;
  
  container.appendChild(row);
  feather.replace();

  // ═══════════════════════════════════════════════════════════════════
  // EVENT 1: User types in search box
  // ═══════════════════════════════════════════════════════════════════
  const searchInput = row.querySelector('.material-item-search');
  const resultsContainer = row.querySelector('.material-search-results');
  const idInput = row.querySelector('.material-item-id');
  const qtyInput = row.querySelector('.material-item-quantity');

  searchInput.addEventListener('keyup', () => {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
      resultsContainer.classList.add('hidden');
      return;
    }

    // FILTER INVENTORY: Find matching items
    const filteredItems = window.appState.inventory.filter(item => 
      item.name.toLowerCase().includes(searchTerm)
    );

    // DISPLAY RESULTS: Show items with stock levels
    resultsContainer.innerHTML = filteredItems.map(item => 
      `<div class="p-2 hover:bg-gray-100 cursor-pointer" 
            data-id="${item.id}" 
            data-name="${item.name}" 
            data-stock="${item.quantity}">
        ${item.name} (In Stock: ${item.quantity})
      </div>`
    ).join('');
    
    resultsContainer.classList.remove('hidden');
  });

  // ═══════════════════════════════════════════════════════════════════
  // EVENT 2: User clicks item from dropdown
  // ═══════════════════════════════════════════════════════════════════
  resultsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('p-2')) {
      // Populate fields from selected item
      idInput.value = e.target.dataset.id;
      searchInput.value = e.target.dataset.name;
      qtyInput.max = e.target.dataset.stock;  // Set max quantity
      resultsContainer.classList.add('hidden');
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // EVENT 3: Close dropdown on outside click
  // ═══════════════════════════════════════════════════════════════════
  document.addEventListener('click', (e) => {
    if (!row.contains(e.target)) {
      resultsContainer.classList.add('hidden');
    }
  }, true);

  // ═══════════════════════════════════════════════════════════════════
  // EVENT 4: Delete button removes row
  // ═══════════════════════════════════════════════════════════════════
  row.querySelector('.remove-material-row-btn').addEventListener('click', () => {
    row.remove();
  });
};

// Initialize first row on modal open
document.getElementById('add-material-row-btn').addEventListener('click', () => {
  addMaterialRow();
});

// If editing existing schedule, load previous materials
if (scheduleToEdit && Array.isArray(scheduleToEdit.materialsUsed)) {
  scheduleToEdit.materialsUsed.forEach(addMaterialRow);
}
```

---

### Pattern 2: Inventory Stock Validation & Batch Update

```javascript
// ═══════════════════════════════════════════════════════════════════
// WHEN USER SAVES SCHEDULE WITH MATERIALS
// ═══════════════════════════════════════════════════════════════════

document.getElementById('schedule-modal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const id = formData.get('id');  // If editing, has ID; if creating, empty
  
  // ───────────────────────────────────────────────────────────────
  // STEP 1: EXTRACT MATERIALS FROM FORM
  // ───────────────────────────────────────────────────────────────
  const materialsUsed = [];
  let hasError = false;
  
  document.querySelectorAll('.material-row').forEach(row => {
    const itemId = row.querySelector('.material-item-id').value;
    const itemName = row.querySelector('.material-item-search').value;
    const quantity = Number(row.querySelector('.material-item-quantity').value);

    if (itemId && quantity > 0) {
      // ─────────────────────────────────────────────────────────
      // VALIDATION: Check available stock
      // ─────────────────────────────────────────────────────────
      const stock = Number(row.querySelector('.material-item-quantity').max || '0');
      
      // If editing: get old quantity for this item (to add back)
      const oldQty = (scheduleToEdit?.materialsUsed?.find(m => m.itemId === itemId)?.quantity || 0);
      
      // Formula: new_quantity ≤ available_stock + old_quantity
      if (quantity > stock + oldQty) {
        showModal(`
          <div class="p-4 text-center">
            <p class="text-lg font-medium">
              Not enough stock for ${itemName}. 
              Only ${stock + oldQty} available.
            </p>
            <div class="flex justify-center mt-6">
              <button class="close-modal-btn btn btn-primary">OK</button>
            </div>
          </div>
        `);
        feather.replace();
        hasError = true;
        return;  // Stop processing
      }

      // Valid material - add to array
      materialsUsed.push({ itemId, itemName, quantity });
    }
  });
  
  if (hasError) return;

  // ───────────────────────────────────────────────────────────────
  // STEP 2: CALCULATE INVENTORY CHANGES
  // ───────────────────────────────────────────────────────────────
  
  const batch = writeBatch(db);
  
  // Get old materials (if editing)
  const oldMaterials = (Array.isArray(scheduleToEdit?.materialsUsed) 
                        ? scheduleToEdit.materialsUsed 
                        : []) || [];
  
  // Track net change for each item
  const inventoryChanges = new Map();

  // Step 2a: Add back old materials (restore what was previously assigned)
  oldMaterials.forEach(m => {
    inventoryChanges.set(
      m.itemId, 
      (inventoryChanges.get(m.itemId) || 0) + m.quantity
    );
  });

  // Step 2b: Subtract new materials
  materialsUsed.forEach(m => {
    inventoryChanges.set(
      m.itemId, 
      (inventoryChanges.get(m.itemId) || 0) - m.quantity
    );
  });

  // ───────────────────────────────────────────────────────────────
  // STEP 3: UPDATE INVENTORY IN BATCH
  // ───────────────────────────────────────────────────────────────
  
  for (const [itemId, change] of inventoryChanges.entries()) {
    if (change !== 0) {  // Only update if there's a change
      const itemRef = doc(db, `${dataPath}/inventory/${itemId}`);
      const currentItem = window.appState.inventory.find(i => i.id === itemId);
      
      // FORMULA: new_quantity = current_quantity + change
      batch.update(itemRef, { 
        quantity: currentItem.quantity + change 
      });
    }
  }

  // ───────────────────────────────────────────────────────────────
  // STEP 4: CREATE OR UPDATE SCHEDULE IN BATCH
  // ───────────────────────────────────────────────────────────────
  
  const schedule = {
    date: formData.get('date'),
    task: formData.get('task'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    notes: formData.get('notes'),
    assignedUserIds: formData.getAll('assignedUserIds'),
    address: formData.get('address'),
    vehicle: formData.get('vehicle'),
    priority: formData.get('priority'),
    status: scheduleToEdit?.status || 'Pending',
    materialsUsed: materialsUsed,  // ← NEW FIELD
    materialsConfirmed: scheduleToEdit?.materialsConfirmed || false,
  };

  if (id) {
    // EDITING: Merge with existing
    const scheduleRef = doc(db, `${dataPath}/schedules/${id}`);
    batch.set(scheduleRef, schedule, { merge: true });
  } else {
    // CREATING: New document
    const newScheduleRef = doc(collection(db, `${dataPath}/schedules`));
    batch.set(newScheduleRef, schedule);
  }

  // ───────────────────────────────────────────────────────────────
  // STEP 5: COMMIT BATCH TRANSACTION
  // ───────────────────────────────────────────────────────────────
  
  await batch.commit();
  // ✓ All inventory updates applied
  // ✓ Schedule saved with materials
  // ✓ Either ALL succeed or NONE (atomic)
  
  hideModal();
});
```

---

### Pattern 3: Material Return Reconciliation

```javascript
// ═══════════════════════════════════════════════════════════════════
// SUPERVISOR CONFIRMS MATERIAL RETURNS
// ═══════════════════════════════════════════════════════════════════

function showConfirmReturnModal(scheduleId) {
  const schedule = window.appState.schedules.find(s => s.id === scheduleId);
  
  if (!schedule?.materialsUsed?.length) {
    showModal(`<p>No materials to reconcile.</p>`);
    return;
  }

  // ───────────────────────────────────────────────────────────────
  // GENERATE RECONCILIATION FORM
  // ───────────────────────────────────────────────────────────────
  
  const reconciliationFields = schedule.materialsUsed.map((item, index) => `
    <div class="grid grid-cols-1 gap-2 border-t pt-3 mt-3">
      <!-- Material name and used quantity -->
      <p class="font-medium text-gray-800">
        ${item.itemName} (Used: ${item.quantity})
      </p>
      
      <div class="grid grid-cols-2 gap-2">
        <!-- GOOD ITEMS: Return to inventory -->
        <div>
          <label for="recon-good-${index}" class="text-sm font-medium text-gray-700">
            Good Qty
          </label>
          <input type="number" 
                 id="recon-good-${index}" 
                 data-item-id="${item.itemId}" 
                 data-item-name="${item.itemName}" 
                 name="good-${item.itemId}" 
                 class="w-full border rounded-md p-2 good-qty-input" 
                 placeholder="Good" 
                 max="${item.quantity}" 
                 min="0" 
                 value="${item.quantity}">
          <!-- Default: assume all items are good -->
        </div>
        
        <!-- DAMAGED ITEMS: Log separately -->
        <div>
          <label for="recon-damaged-${index}" class="text-sm font-medium text-gray-700">
            Damaged Qty
          </label>
          <input type="number" 
                 id="recon-damaged-${index}" 
                 name="damaged-${item.itemId}" 
                 class="w-full border rounded-md p-2 damaged-qty-input" 
                 placeholder="Damaged" 
                 max="${item.quantity}" 
                 min="0" 
                 value="0">
          <!-- Default: no damaged items -->
        </div>
      </div>
    </div>
  `).join('');

  const modalHTML = `
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">Reconcile Material Returns</h2>
      <button class="close-modal-btn p-2 rounded-full hover:bg-gray-200">
        <i data-feather="x"></i>
      </button>
    </div>
    
    <form id="confirm-return-form" class="space-y-4">
      <input type="hidden" name="id" value="${scheduleId}">
      
      <!-- QUANTITIES SECTION -->
      <div class="space-y-3 p-3 border rounded-md bg-gray-50">
        <h3 class="font-semibold mb-2">Returned & Damaged Quantities</h3>
        ${reconciliationFields}
      </div>

      <!-- PHOTO UPLOAD SECTION -->
      <div>
        <label class="block text-sm font-medium mb-1">
          Photo of Returned Items
        </label>
        <input type="file" 
               id="confirm-photo-input" 
               accept="image/*" 
               capture="environment" 
               class="hidden">
        <input type="hidden" 
               id="photo-data-input" 
               name="photoData">
        
        <button type="button" 
                id="add-confirm-photo-btn" 
                class="btn btn-secondary w-full mt-1">
          <i data-feather="camera"></i> Add Photo
        </button>
        
        <!-- Preview image after upload -->
        <img id="photo-preview" 
             src="" 
             class="mt-2 w-24 h-24 rounded-md object-cover border hidden">
      </div>

      <!-- NOTES SECTION -->
      <div>
        <label class="block text-sm font-medium mb-1">
          Discrepancy Notes (Required if quantities don't match)
        </label>
        <textarea name="discrepancyNotes" 
                  class="w-full border rounded-md p-2 h-24" 
                  placeholder="e.g., 'One drill was damaged on site. Missing 2 boxes.'">
        </textarea>
      </div>

      <!-- FORM BUTTONS -->
      <div class="flex justify-end gap-4 !mt-6">
        <button type="button" 
                class="close-modal-btn btn btn-secondary">
          Cancel
        </button>
        <button type="submit" 
                class="btn btn-primary !bg-indigo-500">
          Confirm & Finish Job
        </button>
      </div>
    </form>
  `;

  showModal(modalHTML);
  feather.replace();

  // ───────────────────────────────────────────────────────────────
  // PHOTO UPLOAD EVENT
  // ───────────────────────────────────────────────────────────────
  
  document.getElementById('add-confirm-photo-btn').addEventListener('click', () => {
    document.getElementById('confirm-photo-input').click();
  });

  document.getElementById('confirm-photo-input').addEventListener('change', (e) => {
    document.getElementById('photo-preview').classList.remove('hidden');
    handleImageUpload(e, 'photo-preview', 'photo-data-input');
    // handleImageUpload: Converts image to base64 and stores in hidden input
  });

  // ───────────────────────────────────────────────────────────────
  // FORM SUBMIT: PROCESS RETURNS
  // ───────────────────────────────────────────────────────────────
  
  document.getElementById('confirm-return-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const scheduleId = formData.get('id');

    // ─────────────────────────────────────────────────────────────
    // COLLECT GOOD & DAMAGED QUANTITIES
    // ─────────────────────────────────────────────────────────────
    
    const returnedItems = {};  // Good items to add to inventory
    const damagedItems = {};   // Damaged items to log

    // Collect all "Good Qty" inputs
    document.querySelectorAll('.good-qty-input').forEach(input => {
      if (input.value) {
        returnedItems[input.dataset.itemId] = input.value;
      }
    });

    // Collect all "Damaged Qty" inputs
    document.querySelectorAll('.damaged-qty-input').forEach(input => {
      if (input.value) {
        damagedItems[input.dataset.itemId] = input.value;
      }
    });

    // ─────────────────────────────────────────────────────────────
    // PREPARE RECONCILIATION DATA
    // ─────────────────────────────────────────────────────────────
    
    const reconciliationData = {
      photoData: formData.get('photoData'),              // Base64 image
      discrepancyNotes: formData.get('discrepancyNotes'),
      returnedItems: returnedItems,    // {itemId: qty, ...}
      damagedItems: damagedItems       // {itemId: qty, ...}
    };

    // ─────────────────────────────────────────────────────────────
    // CALL CORE RECONCILIATION FUNCTION
    // ─────────────────────────────────────────────────────────────
    
    await confirmMaterialReturns(scheduleId, reconciliationData);
    hideModal();
  });
}
```

---

### Pattern 4: ⭐ Core Reconciliation with Batch Transaction

```javascript
// ═══════════════════════════════════════════════════════════════════
// MOST IMPORTANT FUNCTION: Process material returns atomically
// ═══════════════════════════════════════════════════════════════════

async function confirmMaterialReturns(scheduleId, reconciliationData) {
  try {
    // ───────────────────────────────────────────────────────────────
    // STEP 1: BEGIN BATCH TRANSACTION
    // ───────────────────────────────────────────────────────────────
    
    const batch = writeBatch(db);
    
    // ───────────────────────────────────────────────────────────────
    // STEP 2: PROCESS GOOD ITEMS (add back to inventory)
    // ───────────────────────────────────────────────────────────────
    
    for (const [itemId, returnedQtyStr] of Object.entries(reconciliationData.returnedItems)) {
      const returnedQty = Number(returnedQtyStr);
      
      // Validate number
      if (isNaN(returnedQty) || returnedQty < 0) continue;

      // Get current inventory document
      const itemRef = doc(db, `${dataPath}/inventory/${itemId}`);
      const itemDoc = await getDoc(itemRef);
      
      if (itemDoc.exists()) {
        const currentQty = Number(itemDoc.data().quantity);
        
        // ✓ ADD GOOD ITEMS TO INVENTORY
        batch.update(itemRef, { 
          quantity: currentQty + returnedQty 
        });
      }
    }

    // ───────────────────────────────────────────────────────────────
    // STEP 3: LOG DAMAGED ITEMS (separate collection for audit)
    // ───────────────────────────────────────────────────────────────
    
    for (const [itemId, damagedQtyStr] of Object.entries(reconciliationData.damagedItems)) {
      const damagedQty = Number(damagedQtyStr);
      
      // Only log if quantity > 0
      if (isNaN(damagedQty) || damagedQty <= 0) continue;

      // Look up item name from inventory
      const item = window.appState.inventory.find(i => i.id === itemId);
      
      // Create NEW damage record
      const damageLogRef = doc(collection(db, `${dataPath}/damagedItems`));
      
      // ✓ LOG DAMAGED ITEM WITH FULL CONTEXT
      batch.set(damageLogRef, {
        itemId: itemId,
        itemName: item?.name || 'Unknown Item',
        quantity: damagedQty,
        scheduleId: scheduleId,
        date: new Date().toISOString().split('T')[0],
        timestamp: serverTimestamp()  // Server-generated time (not client time)
      });
    }

    // ───────────────────────────────────────────────────────────────
    // STEP 4: UPDATE SCHEDULE (mark complete with full details)
    // ───────────────────────────────────────────────────────────────
    
    const scheduleRef = doc(db, `${dataPath}/schedules/${scheduleId}`);
    
    // ✓ UPDATE SCHEDULE WITH RECONCILIATION DETAILS
    batch.update(scheduleRef, {
      // Status: Mark as finished
      status: 'Finished',
      
      // Confirmation flags
      materialsConfirmed: true,
      materialsConfirmedBy: window.appState.impersonatedUser?.name || 'Admin',
      materialsConfirmationTime: new Date().toISOString(),
      
      // Photo proof
      materialReturnPhotoData: reconciliationData.photoData,
      
      // Full reconciliation details
      reconciliationDetails: {
        returnedItems: reconciliationData.returnedItems,    // Good items
        damagedItems: reconciliationData.damagedItems,      // Damaged items
        discrepancyNotes: reconciliationData.discrepancyNotes,
      }
    });

    // ───────────────────────────────────────────────────────────────
    // STEP 5: COMMIT BATCH (atomic operation)
    // ───────────────────────────────────────────────────────────────
    
    await batch.commit();
    
    // ✓ SUCCESS: All changes applied together
    // ✓ Inventory updated with good items
    // ✓ Damage logged to separate collection
    // ✓ Schedule marked complete with full audit trail
    // ✓ No partial updates possible (atomic)

  } catch (e) {
    // ✗ ERROR: No changes applied at all (batch rolled back)
    console.error("Firestore Error: Could not confirm material returns.", e);
    // User can retry
  }
}
```

---

## 📝 Summary Table: Flow vs. Code Pattern

| Flow Phase | Function | Key Code Pattern |
|------------|----------|------------------|
| Material Search | `addMaterialRow()` | `addEventListener('keyup')` + `filter()` |
| Inventory Lookup | `searchInput event` | Find in appState.inventory by name |
| Stock Display | Search dropdown | `item.quantity` shown in results |
| Quantity Entry | `addMaterialRow()` | `<input type="number">` with max |
| Schedule Save | `schedule-modal-form submit` | Batch update + validation |
| Inventory Deduct | Batch transaction | For each material: `quantity -= used_qty` |
| Status Update | `updateScheduleStatus()` | Has materials? → "Pending Confirmation" |
| Job Complete | Crew clicks button | Status → "Pending Confirmation" OR "Finished" |
| Return Modal | `showConfirmReturnModal()` | Show good/damaged input fields |
| Reconciliation | Form submit | Collect good + damaged quantities |
| Batch Commit | `confirmMaterialReturns()` | writeBatch() → all operations succeed/fail |
| Inventory Return | Batch update | For each good item: `quantity += returned_qty` |
| Damage Log | Batch set | Create damagedItems document |
| Schedule Mark Done | Batch update | Set status="Finished" + reconciliation details |
| Dashboard Refresh | Listeners | Real-time update of finished jobs + damage count |

---

## ✨ Key Takeaways

1. **Material rows are dynamic**: Users can add/remove as needed
2. **Stock is validated**: Can't assign more than available
3. **Inventory is deducted immediately**: When schedule is saved
4. **Status workflow is automatic**: Depends on whether materials assigned
5. **Reconciliation is supervised**: Requires admin/supervisor review
6. **Batch transactions ensure consistency**: All or nothing approach
7. **Photo provides proof**: Attachment for dispute resolution
8. **Damage is logged separately**: Audit trail for quality analysis
9. **Dashboard updates in real-time**: Uses Firestore listeners
10. **Discrepancy notes explain variance**: Why quantities don't match

---


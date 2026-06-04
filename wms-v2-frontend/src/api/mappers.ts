// ═══════════════════════════════════════════════════════════════
// WMS v2 — Actual API Field Mappings
// ═══════════════════════════════════════════════════════════════
// Frontend type → Actual API field
//
// SHIPMENT:
//   trackingNumber → name
//   totalBoxes → originalBoxCount (totalBoxes also exists)
//   totalCBM → cbm
//   totalWeight → weight
//   consigneeName → customerName
//   destination → destination (sometimes null)
//   origin → origin (sometimes null)
//   receivedDate → arrivalDate
//   shipmentPhotos → string[] of URLs
//   boxes → array with fields: id, boxNumber, status, rackCode?, rackId?
//   companyProfile → { id, name }
//   rackLocation → rackLocations (string)
//   qrCode → qrCode

// Map shipments API response to usable format
export function mapShipment(s: any): any {
  return {
    ...s,
    id: s.id,
    trackingNumber: s.name || s.referenceId || '',
    referenceId: s.referenceId || '',
    totalBoxes: s.originalBoxCount ?? s.totalBoxes ?? 0,
    currentBoxCount: s.currentBoxCount ?? s.originalBoxCount ?? 0,
    totalCBM: s.cbm || 0,
    totalWeight: s.weight || 0,
    clientName: s.clientName || '',
    clientPhone: s.clientPhone || '',
    clientEmail: s.clientEmail || '',
    consigneeName: s.customerName || '',
    status: s.status || 'PENDING',
    arrivalDate: s.arrivalDate || s.createdAt,
    receivedDate: s.arrivalDate || s.createdAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    shipmentPhotos: s.shipmentPhotos || [],
    notes: s.notes || '',
    description: s.description || '',
    palletCount: s.palletCount || 0,
    estimatedValue: s.estimatedValue || 0,
    rackCode: s.rackLocations || '',
    rackLocation: s.rackLocations || '',
    qrCode: s.qrCode || '',
    isWarehouseShipment: s.isWarehouseShipment ?? true,
    companyProfile: s.companyProfile || null,
    companyProfileId: s.companyProfileId || '',
    createdByName: s.createdBy?.name || '',
    createdBy: s.createdBy || null,
    assignedByName: s.assignedBy?.name || '',
    boxes: (s.boxes || []).map((b: any) => ({
      id: b.id,
      barcode: b.barcode || `BOX-${b.boxNumber}`,
      boxNumber: b.boxNumber,
      status: b.status || 'IN_STORAGE',
      rackId: b.rackId || '',
      rackCode: b.rackCode || '',
      weight: b.weight || 0,
    })),
  }
}

export function mapShipmentList(shipments: any[]): any[] {
  return (shipments || []).map(mapShipment)
}

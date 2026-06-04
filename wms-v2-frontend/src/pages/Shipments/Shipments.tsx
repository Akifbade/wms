// ═══════════════════════════════════════════════════════════════
// WMS v2 — Shipments Page (Complete)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  // Navigation / Actions
  Plus, Search, X, MoreVertical,
  // View modes
  LayoutGrid, List,
  // Shipment actions
  Eye, QrCode, Edit3, LogOut, FileText, Trash2,
  // Stats / Info
  Package, Box, MapPin, Calendar, Clock, User, Building2,
  // Status / Feedback
  AlertCircle, Loader2, RefreshCw,
  // Modal / Form
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  // Finance
  Receipt, CreditCard,
  // Misc
  ArrowUpDown, Camera, Ruler,
} from 'lucide-react'
import {
  shipmentsAPI, companiesAPI, customFieldsAPI, billingAPI,
  withdrawalsAPI, uploadAPI,
} from '../../api/client'
import type {
  Shipment, Box as BoxType, ShipmentDimension, Withdrawal, ChargeType,
  CompanyProfile, CustomField,
} from '../../api/types'
import {
  formatDate, formatDateTime, formatCurrency, getStatusColor,
  getStatusLabel, calcCBM, getDaysBetween, truncate, cn,
} from '../../lib/utils'
import { mapShipment, mapShipmentList } from '../../api/mappers'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ViewMode = 'folder' | 'table'
type SortKey = 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'cbm_asc' | 'cbm_desc' | 'duration_asc' | 'duration_desc' | 'pieces_asc' | 'pieces_desc'

const STATUS_TABS = ['All', 'Pending', 'In Storage', 'Partial', 'Released'] as const
type StatusTab = typeof STATUS_TABS[number]

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc', label: 'Newest First' },
  { key: 'date_asc', label: 'Oldest First' },
  { key: 'name_asc', label: 'Name A-Z' },
  { key: 'name_desc', label: 'Name Z-A' },
  { key: 'cbm_desc', label: 'CBM (High→Low)' },
  { key: 'cbm_asc', label: 'CBM (Low→High)' },
  { key: 'duration_desc', label: 'Duration (Longest)' },
  { key: 'duration_asc', label: 'Duration (Shortest)' },
  { key: 'pieces_desc', label: 'Pieces (Most)' },
  { key: 'pieces_asc', label: 'Pieces (Fewest)' },
]

interface FormDataState {
  clientName: string; clientPhone: string; clientEmail: string;
  referenceId: string; storageType: string; description: string; notes: string;
  companyProfileId: string; isWarehouseShipment: boolean;
  dimensions: ShipmentDimension[]; totalBoxes: number;
  estimatedValue: number; specialInstructions: string;
  rackCode: string; rackId: string;
  palletMode: boolean;
}

const emptyForm: FormDataState = {
  clientName: '', clientPhone: '', clientEmail: '',
  referenceId: '', storageType: 'WAREHOUSE', description: '', notes: '',
  companyProfileId: '', isWarehouseShipment: true,
  dimensions: [], totalBoxes: 0,
  estimatedValue: 0, specialInstructions: '',
  rackCode: '', rackId: '',
  palletMode: false,
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-[10px]'
  return (
    <span className={cn('inline-flex items-center font-medium rounded-full whitespace-nowrap', sizeClass, getStatusColor(status))}>
      {getStatusLabel(status)}
    </span>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading shipments...</p>
      </div>
    </div>
  )
}

function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md w-full text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-1">Failed to load shipments</h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">{message}</p>
        <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PHOTO LIGHTBOX
// ═══════════════════════════════════════════════════════════════

function PhotoLightbox({
  photos, currentIndex, onClose, onNavigate,
}: {
  photos: string[]; currentIndex: number; onClose: () => void; onNavigate: (idx: number) => void;
}) {
  const [loaded, setLoaded] = useState<Set<number>>(new Set([currentIndex]))

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate(Math.max(0, currentIndex - 1))
      if (e.key === 'ArrowRight') onNavigate(Math.min(photos.length - 1, currentIndex + 1))
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', handleKey); document.body.style.overflow = '' }
  }, [currentIndex, photos.length, onClose, onNavigate])

  const preloadNearby = useCallback((idx: number) => {
    const toLoad = [idx - 1, idx, idx + 1].filter(i => i >= 0 && i < photos.length)
    setLoaded(prev => new Set([...prev, ...toLoad]))
  }, [photos.length])

  useEffect(() => { preloadNearby(currentIndex) }, [currentIndex, preloadNearby])

  if (!photos.length) return null

  const currentPhoto = photos[currentIndex]

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center" onClick={onClose}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
        <span className="text-white text-sm font-medium">{currentIndex + 1} / {photos.length}</span>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center w-full px-16" onClick={e => e.stopPropagation()}>
        {currentPhoto ? (
          loaded.has(currentIndex) ? (
            <img src={currentPhoto} alt={`Photo ${currentIndex + 1}`} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          )
        ) : (
          <div className="text-white/50 text-sm">No image available</div>
        )}
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <button onClick={e => { e.stopPropagation(); onNavigate(currentIndex - 1) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onNavigate(currentIndex + 1) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 p-4 bg-gradient-to-t from-black/60 to-transparent overflow-x-auto" onClick={e => e.stopPropagation()}>
          {photos.map((photo, idx) => (
            <button key={idx} onClick={() => onNavigate(idx)}
              className={cn('w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all',
                idx === currentIndex ? 'border-white opacity-100 scale-110' : 'border-transparent opacity-50 hover:opacity-80',
              )}>
              <img src={photo} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM CHARGES MODAL (Inline)
// ═══════════════════════════════════════════════════════════════

function CustomChargesModal({ shipmentId, onClose }: { shipmentId: string; onClose: () => void }) {
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [selectedCharges, setSelectedCharges] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    billingAPI.getChargeTypes({ active: true })
      .then(res => { setChargeTypes(res.chargeTypes || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Build invoice line items from selected charges
      const lineItems = Object.entries(selectedCharges)
        .filter(([_, qty]) => qty > 0)
        .map(([chargeTypeId, qty]) => {
          const ct = chargeTypes.find(c => c.id === chargeTypeId)
          return {
            description: ct?.name || 'Charge',
            quantity: qty,
            unitPrice: ct?.rate || 0,
            amount: (ct?.rate || 0) * qty,
          }
        })
      if (lineItems.length > 0) {
        await billingAPI.createInvoice({
          shipmentId,
          lineItems,
          status: 'UNPAID',
        })
      }
      onClose()
    } catch (err: any) {
      alert(err?.message || 'Failed to save charges')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <ModalHeader title="Custom Charges" subtitle={`Shipment: ${truncate(shipmentId, 12)}`} onClose={onClose} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : chargeTypes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No charge types configured. Go to Billing settings to add them.</p>
          ) : (
            chargeTypes.map(ct => (
              <div key={ct.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ct.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(ct.rate || 0)}{ct.unit ? ` / ${ct.unit}` : ''}</p>
                </div>
                <input type="number" min={0} step={1} placeholder="Qty"
                  className="w-20 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                  value={selectedCharges[ct.id] || 0}
                  onChange={e => setSelectedCharges(prev => ({ ...prev, [ct.id]: Math.max(0, Number(e.target.value)) }))} />
              </div>
            ))
          )}
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || chargeTypes.length === 0}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Charges'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// DETAIL MODAL
// ═══════════════════════════════════════════════════════════════

function DetailModal({ shipmentId, onClose }: { shipmentId: string; onClose: () => void }) {
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moveHistory, setMoveHistory] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [showMoveHistory, setShowMoveHistory] = useState(false)
  const [showChargesModal, setShowChargesModal] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceNote, setAdvanceNote] = useState('')

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true); setError(null)
      try {
        const [shipRes, moveRes, withdrawRes] = await Promise.all([
          shipmentsAPI.getById(shipmentId),
          shipmentsAPI.getMoveHistory(shipmentId).catch(() => ({ moves: [] })),
          withdrawalsAPI.getAll({ shipmentId }).catch(() => ({ withdrawals: [] })),
        ])
        setShipment(mapShipment(shipRes.shipment))
        setMoveHistory(moveRes.moves || [])
        setWithdrawals(withdrawRes.withdrawals || [])
      } catch (err: any) {
        setError(err?.message || 'Failed to load shipment details')
      } finally { setLoading(false) }
    }
    fetchDetails()
  }, [shipmentId])

  const handleRecordAdvance = async () => {
    if (!advanceAmount || Number(advanceAmount) <= 0) return
    try {
      await billingAPI.recordAdvance({
        shipmentId,
        amount: Number(advanceAmount),
        notes: advanceNote,
      })
      setAdvanceAmount(''); setAdvanceNote('')
      alert('Advance recorded successfully')
    } catch (err: any) {
      alert(err?.message || 'Failed to record advance')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }
  if (error || !shipment) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 dark:text-red-400">{error || 'Shipment not found'}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg">Close</button>
        </div>
      </div>
    )
  }

  const daysStored = getDaysBetween(shipment.arrivalDate || shipment.createdAt)
  const storageDurationColor = daysStored > 60 ? 'text-red-600' : daysStored > 30 ? 'text-amber-600' : 'text-green-600'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title={shipment.clientName || 'Shipment Details'} subtitle={`Ref: ${shipment.referenceId || shipment.trackingNumber}`} onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Status & Basic Info */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={shipment.status} size="md" />
                {shipment.companyProfile && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    <Building2 className="w-3 h-3" />
                    {shipment.companyProfile.name}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 font-mono">#{shipment.trackingNumber}</span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoItem icon={<Package className="w-3.5 h-3.5" />} label="Pieces" value={`${shipment.currentBoxCount ?? 0} / ${shipment.totalBoxes ?? 0}`} />
              <InfoItem icon={<Ruler className="w-3.5 h-3.5" />} label="CBM / Weight" value={`${(shipment.totalCBM || 0).toFixed(2)} m³ ${shipment.totalWeight ? `| ${shipment.totalWeight} kg` : ''}`} />
              <InfoItem icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={shipment.rackCode || shipment.rackLocation || 'Not assigned'} />
              <InfoItem icon={<Calendar className="w-3.5 h-3.5" />} label="Arrival" value={formatDate(shipment.arrivalDate || shipment.createdAt)} />
              <InfoItem icon={<Clock className="w-3.5 h-3.5" />} label="Duration" value={`${daysStored} days`} valueClass={storageDurationColor} />
              <InfoItem icon={<User className="w-3.5 h-3.5" />} label="Created by" value={shipment.createdByName || shipment.createdBy || '-'} />
            </div>

            {/* Box Distribution Tree */}
            {shipment.boxes && shipment.boxes.length > 0 && (
              <>
                <SectionDivider label="Box Distribution" />
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {groupBoxesByRack(shipment.boxes).map(({ rack, boxes }) => (
                    <div key={rack || 'unassigned'} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{rack || 'Unassigned'} ({boxes.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {boxes.map(box => (
                          <span key={box.id} className={cn(
                            'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md',
                            box.status === 'RELEASED' ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400' :
                            box.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          )}>
                            {box.barcode}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Move History */}
            {moveHistory.length > 0 && (
              <>
                <SectionDivider label="Move History" />
                <button onClick={() => setShowMoveHistory(!showMoveHistory)}
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  {showMoveHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {moveHistory.length} move{moveHistory.length !== 1 ? 's' : ''}
                </button>
                {showMoveHistory && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {moveHistory.map((move: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{move.action || 'Move'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              From: {move.fromLocation || move.fromRack || '-'} → To: {move.toLocation || move.toRack || '-'}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{formatDateTime(move.createdAt || move.timestamp)}</span>
                        </div>
                        {move.photos && move.photos.length > 0 && (
                          <div className="flex gap-1.5 mt-2">
                            {move.photos.slice(0, 3).map((p: string, pi: number) => (
                              <img key={pi} src={p} alt="" className="w-10 h-10 rounded object-cover border border-gray-200 dark:border-gray-600" />
                            ))}
                            {move.photos.length > 3 && <span className="text-xs text-gray-400 self-center">+{move.photos.length - 3}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Charges Section */}
            <SectionDivider label="Charges" />
            <button onClick={() => setShowChargesModal(true)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Charges</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            {/* Additional Info */}
            {(shipment.description || shipment.specialInstructions || shipment.warehouseNotes) && (
              <>
                <SectionDivider label="Additional Info" />
                <div className="space-y-2 text-sm">
                  {shipment.description && (
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">Description:</span> <span className="text-gray-600 dark:text-gray-400">{shipment.description}</span></div>
                  )}
                  {shipment.specialInstructions && (
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">Instructions:</span> <span className="text-gray-600 dark:text-gray-400">{shipment.specialInstructions}</span></div>
                  )}
                  {shipment.warehouseNotes && (
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">Warehouse Notes:</span> <span className="text-gray-600 dark:text-gray-400">{shipment.warehouseNotes}</span></div>
                  )}
                </div>
              </>
            )}

            {/* Notes */}
            {shipment.notes && (
              <>
                <SectionDivider label="Notes" />
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">{shipment.notes}</p>
              </>
            )}

            {/* Withdrawal History */}
            {withdrawals.length > 0 && (
              <>
                <SectionDivider label="Withdrawal History" />
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {withdrawals.map(w => (
                    <div key={w.id} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{w.withdrawalNumber || `WD-${truncate(w.id, 8)}`}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{w.withdrawnBoxCount || 0} boxes · {w.driverName || 'No driver'} · {w.reason || '-'}</p>
                      </div>
                      <StatusBadge status={w.status} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Audit Trail */}
            <SectionDivider label="Audit Trail" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
              <div><span className="font-medium">Created:</span> {formatDateTime(shipment.createdAt)} {shipment.createdByName ? `by ${shipment.createdByName}` : ''}</div>
              <div><span className="font-medium">Updated:</span> {formatDateTime(shipment.updatedAt)}</div>
              <div><span className="font-medium">Released:</span> {shipment.status === 'RELEASED' ? formatDateTime(shipment.updatedAt) : 'Not yet released'}</div>
            </div>

            {/* Record Advance */}
            <SectionDivider label="Record Advance Payment" />
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="number" placeholder="Amount (KWD)" value={advanceAmount}
                onChange={e => setAdvanceAmount(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input type="text" placeholder="Note (optional)" value={advanceNote}
                onChange={e => setAdvanceNote(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <button onClick={handleRecordAdvance} disabled={!advanceAmount || Number(advanceAmount) <= 0}
                className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors shrink-0">
                Record Advance
              </button>
            </div>
          </div>
        </div>
      </div>

      {showChargesModal && <CustomChargesModal shipmentId={shipmentId} onClose={() => setShowChargesModal(false)} />}
    </>
  )
}

function InfoItem({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
      <div className="shrink-0 mt-0.5 text-gray-400 dark:text-gray-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={cn('text-xs font-semibold text-gray-900 dark:text-white mt-0.5 truncate', valueClass)}>{value}</p>
      </div>
    </div>
  )
}

function groupBoxesByRack(boxes: BoxType[]): { rack: string; boxes: BoxType[] }[] {
  const groups: Record<string, BoxType[]> = {}
  boxes.forEach(box => {
    const key = box.rackCode || 'Unassigned'
    if (!groups[key]) groups[key] = []
    groups[key].push(box)
  })
  return Object.entries(groups).map(([rack, boxes]) => ({ rack, boxes }))
}

// ═══════════════════════════════════════════════════════════════
// CREATE/EDIT MODAL
// ═══════════════════════════════════════════════════════════════

function CreateEditModal({
  shipment, onClose, onSaved,
}: {
  shipment?: Shipment; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!shipment
  const [form, setForm] = useState<FormDataState>(() => {
    if (shipment) {
      return {
        clientName: shipment.clientName || '',
        clientPhone: shipment.clientPhone || '',
        clientEmail: shipment.clientEmail || '',
        referenceId: shipment.referenceId || '',
        storageType: shipment.storageType || 'WAREHOUSE',
        description: shipment.description || '',
        notes: shipment.notes || '',
        companyProfileId: shipment.companyProfileId || '',
        isWarehouseShipment: shipment.isWarehouseShipment ?? true,
        dimensions: shipment.dimensions || [],
        totalBoxes: shipment.totalBoxes || 0,
        estimatedValue: shipment.estimatedValue || 0,
        specialInstructions: shipment.specialInstructions || '',
        rackCode: shipment.rackCode || '',
        rackId: shipment.rackId || '',
        palletMode: false,
      }
    }
    return { ...emptyForm }
  })
  const [companies, setCompanies] = useState<CompanyProfile[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [newDim, setNewDim] = useState({ length: 0, width: 0, height: 0, weight: 0, quantity: 1 })
  const [palletIntake, setPalletIntake] = useState(false)

  useEffect(() => {
    Promise.all([
      companiesAPI.listProfiles().catch(() => ({ profiles: [] })),
      customFieldsAPI.getAll('shipments').catch(() => ({ customFields: [] })),
    ]).then(([compRes, cfRes]) => {
      setCompanies((compRes as any)?.profiles || [])
      setCustomFields(cfRes.customFields || [])
    })
  }, [])

  const handleAddDimension = () => {
    if (!newDim.length || !newDim.width || !newDim.height) return
    const cbm = calcCBM(newDim.length, newDim.width, newDim.height, newDim.quantity)
    const dim: ShipmentDimension = {
      id: `temp_${Date.now()}`,
      shipmentId: shipment?.id || '',
      length: newDim.length,
      width: newDim.width,
      height: newDim.height,
      weight: newDim.weight || undefined,
      quantity: newDim.quantity || 1,
      cbm,
    }
    setForm(prev => ({ ...prev, dimensions: [...(prev.dimensions || []), dim] }))
    setNewDim({ length: 0, width: 0, height: 0, weight: 0, quantity: 1 })
  }

  const handleRemoveDimension = (idx: number) => {
    setForm(prev => ({ ...prev, dimensions: prev.dimensions.filter((_, i) => i !== idx) }))
  }

  const calcTotalCBM = () => {
    return form.dimensions.reduce((sum, d) => sum + (d.cbm || 0), 0)
  }

  const handleSubmit = async () => {
    if (!form.clientName.trim()) { setError('Client name is required'); return }
    if (!isEdit && form.dimensions.length === 0 && form.totalBoxes <= 0) { setError('Add at least one dimension or specify total boxes'); return }

    setSaving(true); setError(null)
    try {
      const payload = {
        ...form,
        totalCBM: calcTotalCBM(),
        totalWeight: form.dimensions.reduce((s, d) => s + (d.weight || 0) * (d.quantity || 1), 0),
        dimensions: form.dimensions.map(d => ({
          length: d.length, width: d.width, height: d.height,
          weight: d.weight, quantity: d.quantity, cbm: d.cbm, label: d.label, itemType: d.itemType,
        })),
      }
      if (isEdit && shipment) {
        await shipmentsAPI.update(shipment.id, payload)
      } else {
        await shipmentsAPI.create(payload)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save shipment')
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title={isEdit ? 'Edit Shipment' : 'New Shipment'} subtitle={isEdit ? `Ref: ${shipment?.referenceId || shipment?.trackingNumber}` : 'Create a new warehouse shipment'} onClose={onClose} />

          {error && (
            <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Pallet / Box intake toggle */}
            <div className="flex items-center gap-3">
              <button onClick={() => setPalletIntake(false)}
                className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  !palletIntake ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}>
                <Box className="w-4 h-4 inline mr-1.5" />Box Mode
              </button>
              <button onClick={() => setPalletIntake(true)}
                className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  palletIntake ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}>
                <LayoutGrid className="w-4 h-4 inline mr-1.5" />Pallet Mode
              </button>
            </div>

            {/* Client Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Client Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Client Name *" value={form.clientName}
                  onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="tel" placeholder="Phone" value={form.clientPhone}
                  onChange={e => setForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="email" placeholder="Email" value={form.clientEmail}
                  onChange={e => setForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <select value={form.companyProfileId}
                  onChange={e => setForm(prev => ({ ...prev, companyProfileId: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">No Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="text" placeholder="Reference ID" value={form.referenceId}
                  onChange={e => setForm(prev => ({ ...prev, referenceId: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>

            {/* Shipment Type */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Shipment Type</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={form.storageType}
                  onChange={e => setForm(prev => ({ ...prev, storageType: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="WAREHOUSE">Warehouse Storage</option>
                  <option value="TRANSIT">In Transit</option>
                  <option value="CONSOLIDATION">Consolidation</option>
                  <option value="CROSS_DOCK">Cross Dock</option>
                </select>
                <input type="number" placeholder="Total Boxes" min={0} value={form.totalBoxes || ''}
                  onChange={e => setForm(prev => ({ ...prev, totalBoxes: Math.max(0, Number(e.target.value)) }))}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Dimensions {palletIntake ? '(Pallets)' : '(Boxes)'}
                <span className="text-xs font-normal text-gray-500 ml-2">Total CBM: {calcTotalCBM().toFixed(3)} m³</span>
              </h4>
              {/* New dimension input */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 mb-2">
                <input type="number" placeholder="L (cm)" value={newDim.length || ''}
                  onChange={e => setNewDim(prev => ({ ...prev, length: Number(e.target.value) }))}
                  className="col-span-2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="number" placeholder="W (cm)" value={newDim.width || ''}
                  onChange={e => setNewDim(prev => ({ ...prev, width: Number(e.target.value) }))}
                  className="col-span-2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="number" placeholder="H (cm)" value={newDim.height || ''}
                  onChange={e => setNewDim(prev => ({ ...prev, height: Number(e.target.value) }))}
                  className="col-span-2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="number" placeholder="Wt (kg)" value={newDim.weight || ''}
                  onChange={e => setNewDim(prev => ({ ...prev, weight: Number(e.target.value) }))}
                  className="col-span-2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="number" placeholder="Qty" min={1} value={newDim.quantity || ''}
                  onChange={e => setNewDim(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                  className="col-span-2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <button onClick={handleAddDimension}
                  className="col-span-2 px-2 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  + Add
                </button>
              </div>
              {/* Dimension list */}
              {form.dimensions.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {form.dimensions.map((dim, idx) => (
                    <div key={dim.id || idx} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs">
                      <span className="text-gray-700 dark:text-gray-300">{dim.length}×{dim.width}×{dim.height} cm {dim.weight ? `· ${dim.weight}kg` : ''} ×{dim.quantity}</span>
                      <span className="text-gray-500">{(dim.cbm || 0).toFixed(3)} m³</span>
                      <button onClick={() => handleRemoveDimension(idx)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rack Assignment */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Rack Assignment</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Rack Code" value={form.rackCode}
                  onChange={e => setForm(prev => ({ ...prev, rackCode: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Additional Info</h4>
              <textarea placeholder="Description" rows={2} value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2" />
              <textarea placeholder="Special Instructions" rows={2} value={form.specialInstructions}
                onChange={e => setForm(prev => ({ ...prev, specialInstructions: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2" />
              <textarea placeholder="Notes" rows={2} value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Custom Fields</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customFields.map(cf => (
                    <div key={cf.id}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{cf.label}{cf.required ? ' *' : ''}</label>
                      {cf.type === 'boolean' ? (
                        <input type="checkbox" checked={!!customFieldValues[cf.name]}
                          onChange={e => setCustomFieldValues(prev => ({ ...prev, [cf.name]: e.target.checked }))}
                          className="rounded border-gray-300 dark:border-gray-600" />
                      ) : cf.type === 'select' ? (
                        <select value={customFieldValues[cf.name] || ''}
                          onChange={e => setCustomFieldValues(prev => ({ ...prev, [cf.name]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                          <option value="">Select...</option>
                          {cf.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                          value={customFieldValues[cf.name] || ''}
                          onChange={e => setCustomFieldValues(prev => ({ ...prev, [cf.name]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-xs text-gray-400">Total CBM: <span className="font-medium text-gray-600 dark:text-gray-300">{calcTotalCBM().toFixed(3)} m³</span></div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : isEdit ? 'Update Shipment' : 'Create Shipment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Fix the double-return issue with CreateEditModal - wrapping properly
// Actually the JSX above has an early return that prevents rendering. Let me restructure.
// We'll use a fragment approach instead.

// ═══════════════════════════════════════════════════════════════
// RELEASE MODAL
// ═══════════════════════════════════════════════════════════════

function ReleaseModal({ shipment, onClose, onReleased }: { shipment: Shipment; onClose: () => void; onReleased: () => void }) {
  const [releaseType, setReleaseType] = useState<'FULL' | 'PARTIAL'>('FULL')
  const [quantity, setQuantity] = useState(shipment.currentBoxCount || shipment.totalBoxes || 0)
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [selectedCharges, setSelectedCharges] = useState<Record<string, number>>({})
  const [collectorId, setCollectorId] = useState('')
  const [releasePhotos, setReleasePhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    billingAPI.getChargeTypes({ active: true })
      .then(res => setChargeTypes(res.chargeTypes || []))
      .catch(() => {})
  }, [])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await uploadAPI.upload(fd, 'release')
        setReleasePhotos(prev => [...prev, res.url])
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const totalCharges = Object.entries(selectedCharges)
    .filter(([_, qty]) => qty > 0)
    .reduce((sum, [ctId, qty]) => {
      const ct = chargeTypes.find(c => c.id === ctId)
      return sum + (ct?.rate || 0) * qty
    }, 0)

  const invoiceLineItems = useMemo(() =>
    Object.entries(selectedCharges)
      .filter(([_, qty]) => qty > 0)
      .map(([ctId, qty]) => {
        const ct = chargeTypes.find(c => c.id === ctId)
        return {
          description: ct?.name || 'Charge',
          quantity: qty,
          unitPrice: ct?.rate || 0,
          amount: (ct?.rate || 0) * qty,
        }
      }),
  [selectedCharges, chargeTypes])

  const handleRelease = async () => {
    setSaving(true)
    try {
      // Create invoice with charges
      if (invoiceLineItems.length > 0) {
        await billingAPI.createInvoice({
          shipmentId: shipment.id,
          lineItems: invoiceLineItems,
          status: 'UNPAID',
        })
      }
      // Release boxes
      await shipmentsAPI.releaseBoxes(shipment.id, {
        type: releaseType,
        quantity: Math.min(quantity, shipment.currentBoxCount || shipment.totalBoxes || 0),
        collectorId,
        photos: releasePhotos,
      })
      onReleased()
      onClose()
    } catch (err: any) {
      alert(err?.message || 'Failed to release shipment')
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title="Release Shipment" subtitle={`${shipment.clientName || 'Unknown'} — ${shipment.referenceId || shipment.trackingNumber}`} onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Release Type */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Release Type</label>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setReleaseType('FULL')}
                  className={cn('flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    releaseType === 'FULL' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}>
                  Full Release
                </button>
                <button onClick={() => setReleaseType('PARTIAL')}
                  className={cn('flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    releaseType === 'PARTIAL' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}>
                  Partial Release
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</label>
              <div className="flex items-center gap-2 mt-2">
                <input type="number" min={1} max={shipment.currentBoxCount || shipment.totalBoxes || 0}
                  value={quantity}
                  onChange={e => setQuantity(Math.min(Math.max(1, Number(e.target.value)), shipment.currentBoxCount || shipment.totalBoxes || 0))}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <span className="text-xs text-gray-500 dark:text-gray-400">/ {shipment.currentBoxCount || shipment.totalBoxes || 0} boxes</span>
              </div>
            </div>

            {/* Collector ID */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collector ID / Name</label>
              <input type="text" placeholder="Enter collector identifier" value={collectorId}
                onChange={e => setCollectorId(e.target.value)}
                className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>

            {/* Charges Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Apply Charges (Invoice Items)</label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {chargeTypes.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">No charge types configured</p>
                ) : (
                  chargeTypes.map(ct => (
                    <div key={ct.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{ct.name}</p>
                        <p className="text-[10px] text-gray-500">{formatCurrency(ct.rate || 0)}{ct.unit ? ` / ${ct.unit}` : ''}</p>
                      </div>
                      <input type="number" min={0} step={1} placeholder="Qty"
                        className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                        value={selectedCharges[ct.id] || 0}
                        onChange={e => setSelectedCharges(prev => ({ ...prev, [ct.id]: Math.max(0, Number(e.target.value)) }))} />
                    </div>
                  ))
                )}
              </div>
              {totalCharges > 0 && (
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2 text-right">
                  Total Charges: {formatCurrency(totalCharges)}
                </p>
              )}
            </div>

            {/* Release Photos */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Release Photos</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {releasePhotos.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
                    <button onClick={() => setReleasePhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-5 h-5" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </div>
            </div>

            {/* Invoice Preview */}
            {invoiceLineItems.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice Preview</label>
                <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/50">
                  {invoiceLineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{item.description} × {item.quantity}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(totalCharges)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleRelease} disabled={saving || (releaseType === 'PARTIAL' && quantity <= 0)}
              className="px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Processing...' : 'Generate Invoice & Release'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// WITHDRAWAL MODAL
// ═══════════════════════════════════════════════════════════════

function WithdrawalModal({ shipment, onClose, onWithdrawn }: { shipment: Shipment; onClose: () => void; onWithdrawn: () => void }) {
  const [boxCount, setBoxCount] = useState(1)
  const [collectorName, setCollectorName] = useState('')
  const [driverName, setDriverName] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [storageCharges, setStorageCharges] = useState(0)

  useEffect(() => {
    // Calculate estimated storage charges
    const days = getDaysBetween(shipment.arrivalDate || shipment.createdAt)
    const cbm = shipment.totalCBM || 0
    const estimatedRate = 0.5 // KWD per CBM per day (example)
    setStorageCharges(days * cbm * estimatedRate)
  }, [shipment])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await uploadAPI.upload(fd, 'withdrawal')
        setPhotos(prev => [...prev, res.url])
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (boxCount <= 0) { alert('Box count must be at least 1'); return }
    setSaving(true)
    try {
      await withdrawalsAPI.create({
        shipmentId: shipment.id,
        withdrawnBoxCount: boxCount,
        collectorName,
        driverName,
        receiptNumber,
        reason,
        notes,
        photos,
      })
      onWithdrawn()
      onClose()
    } catch (err: any) {
      alert(err?.message || 'Failed to create withdrawal')
    } finally { setSaving(false) }
  }

  if (showPayment) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto">
            <ModalHeader title="Payment" subtitle="Continue to complete withdrawal" onClose={onClose} />
            <div className="p-6 space-y-4">
              <div className="text-center">
                <CreditCard className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Payment Required</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Estimated storage charges: {formatCurrency(storageCharges)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Storage (est.)</span><span className="font-medium">{formatCurrency(storageCharges)}</span></div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between"><span className="font-semibold">Total</span><span className="font-semibold">{formatCurrency(storageCharges)}</span></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPayment(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Back</button>
                <button onClick={handleSubmit} disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Processing...' : `Pay ${formatCurrency(storageCharges)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title="New Withdrawal" subtitle={`${shipment.clientName || 'Unknown'} — ${shipment.referenceId || shipment.trackingNumber}`} onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Box Count */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Boxes to Withdraw</label>
              <input type="number" min={1} max={shipment.currentBoxCount || shipment.totalBoxes || 0}
                value={boxCount}
                onChange={e => setBoxCount(Math.max(1, Math.min(Number(e.target.value), shipment.currentBoxCount || shipment.totalBoxes || 0)))}
                className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <p className="text-xs text-gray-400 mt-1">Max: {shipment.currentBoxCount || shipment.totalBoxes || 0} boxes available</p>
            </div>

            {/* Collector Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collector Name</label>
              <input type="text" placeholder="Name of person collecting" value={collectorName}
                onChange={e => setCollectorName(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>

            {/* Driver Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Driver Name</label>
                <input type="text" placeholder="Driver" value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receipt #</label>
                <input type="text" placeholder="Receipt number" value={receiptNumber}
                  onChange={e => setReceiptNumber(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</label>
              <select value={reason} onChange={e => setReason(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">Select reason...</option>
                <option value="DELIVERY">Delivery to Client</option>
                <option value="TRANSFER">Transfer to Another Location</option>
                <option value="RETURN">Return to Shipper</option>
                <option value="DISPOSAL">Disposal</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</label>
              <textarea placeholder="Additional notes..." rows={2} value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>

            {/* Storage Charges Preview */}
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Estimated Storage Charges</span>
                </div>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(storageCharges)}</span>
              </div>
              <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1">Calculated based on duration and CBM. Final amount may vary.</p>
            </div>

            {/* Photos */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Photos</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
                    <button onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-5 h-5" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={() => setShowPayment(true)} disabled={boxCount <= 0}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              Continue to Payment <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// SHIPMENT CARD (Folder View)
// ═══════════════════════════════════════════════════════════════

function ShipmentCard({
  shipment,
  onView,
  onEdit,
  onRelease,
  onReport,
  onDelete,
}: {
  shipment: Shipment;
  onView: () => void;
  onEdit: () => void;
  onRelease: () => void;
  onReport?: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false)
  const daysStored = getDaysBetween(shipment.arrivalDate || shipment.createdAt)
  const durationColor = daysStored > 60 ? 'text-red-600' : daysStored > 30 ? 'text-amber-600' : 'text-green-600'
  const photos = shipment.shipmentPhotos || []
  const canRelease = shipment.status !== 'RELEASED' && shipment.status !== 'CANCELLED'
  const isReleased = shipment.status === 'RELEASED'

  return (
    <div className={cn(
      'relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden transition-all hover:shadow-md group',
      isReleased && 'opacity-85'
    )}>
      {/* RELEASED stamp watermark */}
      {isReleased && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-6xl font-black text-red-500/15 dark:text-red-400/10 -rotate-12 select-none tracking-widest border-4 border-red-500/20 dark:border-red-400/15 px-4 py-2 rounded-xl">
            RELEASED
          </div>
        </div>
      )}

      {/* Photo area */}
      <div className="relative h-36 bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {photos.length > 0 ? (
          <>
            <img src={photos[0]} alt="" className="w-full h-full object-cover" />
            {photos.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                +{photos.length - 1}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        {/* Quick actions overlay */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onView() }}
            className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors">
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Contract/Prepaid badge */}
        <div className="absolute top-2 left-2 flex gap-1">
          {shipment.companyProfile?.hasContract && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">
              Contract
            </span>
          )}
          {(shipment.companyProfile as any)?.prepaidBalance > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full">
              Prepaid
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 space-y-2.5">
        {/* Header: Name + Reference */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">{shipment.clientName || 'Unknown Client'}</h3>
            {shipment.referenceId && (
              <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate mt-0.5">{shipment.referenceId}</p>
            )}
          </div>
          <div className="shrink-0 relative">
            <button onClick={() => setShowActions(!showActions)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 z-30 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 text-sm">
                  <ActionMenuItem icon={<Eye className="w-3.5 h-3.5" />} label="View" onClick={() => { setShowActions(false); onView() }} />
                  <ActionMenuItem icon={<QrCode className="w-3.5 h-3.5" />} label="QR Code" onClick={() => { setShowActions(false); alert('QR Code: ' + shipment.id) }} />
                  <ActionMenuItem icon={<Edit3 className="w-3.5 h-3.5" />} label="Edit" onClick={() => { setShowActions(false); onEdit() }} />
                  {canRelease && <ActionMenuItem icon={<LogOut className="w-3.5 h-3.5" />} label="Release" onClick={() => { setShowActions(false); onRelease() }} />}
                  <ActionMenuItem icon={<FileText className="w-3.5 h-3.5" />} label="Report" onClick={() => { setShowActions(false); onReport?.() }} />
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                  <ActionMenuItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete" onClick={() => { setShowActions(false); onDelete() }} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Company name */}
        {shipment.companyProfile?.name && (
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{shipment.companyProfile.name}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          <StatLine icon={<Box className="w-3 h-3" />} label="Pieces" value={`${shipment.currentBoxCount ?? 0}/${shipment.totalBoxes ?? 0}`} />
          <StatLine icon={<Ruler className="w-3 h-3" />} label="CBM/Wt" value={`${(shipment.totalCBM || 0).toFixed(1)} m³`} />
          <StatLine icon={<MapPin className="w-3 h-3" />} label="Location" value={shipment.rackCode || '-'} />
          <StatLine icon={<Calendar className="w-3 h-3" />} label="Arrival" value={formatDate(shipment.arrivalDate || shipment.createdAt)} />
          <StatLine icon={<Clock className="w-3 h-3" />} label="Duration" value={`${daysStored}d`} valueClass={durationColor} />
          <StatLine icon={<User className="w-3 h-3" />} label="By" value={shipment.createdByName || shipment.createdBy || '-'} />
        </div>

        {/* Status Badge + Actions row */}
        <div className="flex items-center justify-between pt-1">
          <StatusBadge status={shipment.status} />
          <div className="flex gap-1">
            <button onClick={onView} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="View">
              <Eye className="w-3.5 h-3.5" />
            </button>
            {canRelease && (
              <button onClick={onRelease} className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors" title="Release">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionMenuItem({ icon, label, onClick, className }: { icon: React.ReactNode; label: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors', className)}>
      {icon}{label}
    </button>
  )
}

function StatLine({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{label}</span>
      <span className={cn('text-[10px] font-semibold text-gray-800 dark:text-gray-200 truncate ml-auto', valueClass)}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SHIPMENT TABLE ROW (Table View)
// ═══════════════════════════════════════════════════════════════

function ShipmentTableRow({
  shipment,
  onView,
  onEdit,
  onRelease,
  onReport,
  onDelete,
}: {
  shipment: Shipment;
  onView: () => void;
  onEdit: () => void;
  onRelease: () => void;
  onReport?: () => void;
  onDelete: () => void;
}) {
  const daysStored = getDaysBetween(shipment.arrivalDate || shipment.createdAt)
  const canRelease = shipment.status !== 'RELEASED' && shipment.status !== 'CANCELLED'
  const isReleased = shipment.status === 'RELEASED'
  const durationColor = daysStored > 60 ? 'text-red-600' : daysStored > 30 ? 'text-amber-600' : 'text-green-600'

  return (
    <tr className={cn(
      'border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm',
      isReleased && 'opacity-60'
    )}>
      {/* Photo */}
      <td className="py-2.5 px-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
          {(shipment.shipmentPhotos?.length || 0) > 0 ? (
            <img src={shipment.shipmentPhotos![0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full"><Package className="w-4 h-4 text-gray-300 dark:text-gray-600" /></div>
          )}
        </div>
      </td>
      {/* Client */}
      <td className="py-2.5 px-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">{shipment.clientName || '-'}</p>
          <p className="text-[10px] font-mono text-gray-400 truncate">{shipment.referenceId || shipment.trackingNumber}</p>
        </div>
      </td>
      {/* Company */}
      <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">{shipment.companyProfile?.name || '-'}</td>
      {/* Pieces */}
      <td className="py-2.5 px-3 text-xs text-gray-700 dark:text-gray-300">{shipment.currentBoxCount ?? 0}/{shipment.totalBoxes ?? 0}</td>
      {/* CBM */}
      <td className="py-2.5 px-3 text-xs text-gray-700 dark:text-gray-300">{(shipment.totalCBM || 0).toFixed(2)}</td>
      {/* Location */}
      <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">{shipment.rackCode || '-'}</td>
      {/* Arrival */}
      <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">{formatDate(shipment.arrivalDate || shipment.createdAt)}</td>
      {/* Duration */}
      <td className={cn('py-2.5 px-3 text-xs font-medium', durationColor)}>{daysStored}d</td>
      {/* Status */}
      <td className="py-2.5 px-3"><StatusBadge status={shipment.status} /></td>
      {/* Actions */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1">
          <button onClick={onView} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="View"><Eye className="w-3.5 h-3.5" /></button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
          {canRelease && (
            <button onClick={onRelease} className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400" title="Release"><LogOut className="w-3.5 h-3.5" /></button>
          )}
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN SHIPMENTS PAGE
// ═══════════════════════════════════════════════════════════════

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeTab, setActiveTab] = useState<StatusTab>('All')
  const [sortKey, setSortKey] = useState<SortKey>('date_desc')
  const [viewMode, setViewMode] = useState<ViewMode>('folder')
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [pagination, setPagination] = useState<any>(null)

  // Modal states
  const [detailShipmentId, setDetailShipmentId] = useState<string | null>(null)
  const [editShipment, setEditShipment] = useState<Shipment | undefined>(undefined)
  const [showCreate, setShowCreate] = useState(false)
  const [releaseShipment, setReleaseShipment] = useState<Shipment | null>(null)
  const [withdrawShipment, setWithdrawShipment] = useState<Shipment | null>(null)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch shipments
  const fetchShipments = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params: any = {}
      if (debouncedSearch) params.search = debouncedSearch
      if (activeTab !== 'All') {
        const statusMap: Record<string, string> = {
          'Pending': 'PENDING',
          'In Storage': 'IN_STORAGE',
          'Partial': 'PARTIAL',
          'Released': 'RELEASED',
        }
        params.status = statusMap[activeTab] || ''
      }
      const res = await shipmentsAPI.getAll(params)
      setShipments(mapShipmentList(res.shipments || []))
      setStatusCounts(res.statusCounts || {})
      setPagination(res.pagination || null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load shipments')
    } finally { setLoading(false) }
  }, [debouncedSearch, activeTab])

  useEffect(() => { fetchShipments() }, [fetchShipments])

  // Sort
  const sortedShipments = useMemo(() => {
    const arr = [...shipments]
    switch (sortKey) {
      case 'date_asc': return arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case 'date_desc': return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case 'name_asc': return arr.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''))
      case 'name_desc': return arr.sort((a, b) => (b.clientName || '').localeCompare(a.clientName || ''))
      case 'cbm_desc': return arr.sort((a, b) => (b.totalCBM || 0) - (a.totalCBM || 0))
      case 'cbm_asc': return arr.sort((a, b) => (a.totalCBM || 0) - (b.totalCBM || 0))
      case 'duration_desc': return arr.sort((a, b) => getDaysBetween(b.arrivalDate || b.createdAt) - getDaysBetween(a.arrivalDate || a.createdAt))
      case 'duration_asc': return arr.sort((a, b) => getDaysBetween(a.arrivalDate || a.createdAt) - getDaysBetween(b.arrivalDate || b.createdAt))
      case 'pieces_desc': return arr.sort((a, b) => (b.totalBoxes || 0) - (a.totalBoxes || 0))
      case 'pieces_asc': return arr.sort((a, b) => (a.totalBoxes || 0) - (b.totalBoxes || 0))
      default: return arr
    }
  }, [shipments, sortKey])

  // Count for each status tab
  const getTabCount = (tab: StatusTab): number => {
    if (tab === 'All') return shipments.length
    const statusMap: Record<string, string> = {
      'Pending': 'PENDING',
      'In Storage': 'IN_STORAGE',
      'Partial': 'PARTIAL',
      'Released': 'RELEASED',
    }
    return statusCounts[statusMap[tab]] || statusCounts[tab] || 0
  }

  // Handlers
  const handleView = (id: string) => setDetailShipmentId(id)
  const handleEdit = (shipment: Shipment) => { setEditShipment(shipment); setShowCreate(true) }
  const handleRelease = (shipment: Shipment) => setReleaseShipment(shipment)
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shipment? This action cannot be undone.')) return
    try {
      await shipmentsAPI.delete(id)
      fetchShipments()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete shipment')
    }
  }
  const handleReport = async (shipment: Shipment) => {
    try {
      const res = await shipmentsAPI.getById(shipment.id)
      alert(`Report generated for ${res.shipment.clientName || shipment.trackingNumber}. Check Reports page.`)
    } catch (err: any) {
      alert(err?.message || 'Failed to generate report')
    }
  }
  const handleOpenPhotos = (shipment: Shipment, photoIdx = 0) => {
    if ((shipment.shipmentPhotos?.length || 0) > 0) {
      setLightboxPhotos(shipment.shipmentPhotos!)
      setLightboxIndex(photoIdx)
    }
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shipments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage warehouse shipments, storage, and releases</p>
        </div>
        <button onClick={() => { setEditShipment(undefined); setShowCreate(true) }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Shipment
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SEARCH + SORT + VIEW TOGGLE
         ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search by client name, reference ID, or tracking number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer">
            {SORT_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
          </select>
          <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
          <button onClick={() => setViewMode('folder')}
            className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'folder' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('table')}
            className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATUS FILTER TABS
         ═══════════════════════════════════════════════════════ */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => {
          const count = getTabCount(tab)
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all',
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}>
              {tab}
              <span className={cn(
                'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════
          CONTENT
         ═══════════════════════════════════════════════════════ */}
      {loading ? <PageLoader /> : error ? <PageError message={error} onRetry={fetchShipments} /> : (
        <>
          {sortedShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-1">No shipments found</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                {debouncedSearch ? 'Try a different search term' : 'Create your first shipment to get started'}
              </p>
              {!debouncedSearch && (
                <button onClick={() => { setEditShipment(undefined); setShowCreate(true) }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                  <Plus className="w-4 h-4" /> Create Shipment
                </button>
              )}
            </div>
          ) : viewMode === 'folder' ? (
            // ── FOLDER VIEW ────────────────────────────────
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedShipments.map(shipment => (
                <ShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                  onView={() => handleView(shipment.id)}
                  onEdit={() => handleEdit(shipment)}
                  onRelease={() => handleRelease(shipment)}
                  onReport={() => handleReport(shipment)}
                  onDelete={() => handleDelete(shipment.id)}
                />
              ))}
            </div>
          ) : (
            // ── TABLE VIEW ─────────────────────────────────
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="text-left py-3 px-3 w-14"></th>
                    <th className="text-left py-3 px-3">Client</th>
                    <th className="text-left py-3 px-3">Company</th>
                    <th className="text-left py-3 px-3">Pieces</th>
                    <th className="text-left py-3 px-3">CBM</th>
                    <th className="text-left py-3 px-3">Location</th>
                    <th className="text-left py-3 px-3">Arrival</th>
                    <th className="text-left py-3 px-3">Duration</th>
                    <th className="text-left py-3 px-3">Status</th>
                    <th className="text-left py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedShipments.map(shipment => (
                    <ShipmentTableRow
                      key={shipment.id}
                      shipment={shipment}
                      onView={() => handleView(shipment.id)}
                      onEdit={() => handleEdit(shipment)}
                      onRelease={() => handleRelease(shipment)}
                      onDelete={() => handleDelete(shipment.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pagination info */}
      {pagination && !loading && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2">
          <span>Showing {shipments.length} of {pagination.total || shipments.length} shipments</span>
          {pagination.pages && pagination.pages > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => (
                <button key={i} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODALS
         ═══════════════════════════════════════════════════════ */}

      {/* Detail Modal */}
      {detailShipmentId && (
        <DetailModal shipmentId={detailShipmentId} onClose={() => setDetailShipmentId(null)} />
      )}

      {/* Create/Edit Modal */}
      {showCreate && (
        <CreateEditModal
          shipment={editShipment}
          onClose={() => { setShowCreate(false); setEditShipment(undefined) }}
          onSaved={fetchShipments}
        />
      )}

      {/* Release Modal */}
      {releaseShipment && (
        <ReleaseModal
          shipment={releaseShipment}
          onClose={() => setReleaseShipment(null)}
          onReleased={fetchShipments}
        />
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && withdrawShipment && (
        <WithdrawalModal
          shipment={withdrawShipment}
          onClose={() => { setShowWithdrawModal(false); setWithdrawShipment(null) }}
          onWithdrawn={fetchShipments}
        />
      )}

      {/* Photo Lightbox */}
      {lightboxPhotos.length > 0 && (
        <PhotoLightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxPhotos([])}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}
    </div>
  )
}

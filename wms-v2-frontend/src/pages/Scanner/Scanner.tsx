import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  ScanLine, Camera, CameraOff, AlertTriangle, CheckCircle2, XCircle,
  Package, Ruler, ClipboardList, Move, ArrowRight, Search,
  Info, ChevronDown, ChevronUp, Image, Trash2, Plus, Loader2,
  RotateCcw, MapPin, HardDrive, UserCheck, FileText
} from 'lucide-react'
import { shipmentsAPI, racksAPI, uploadAPI, usersAPI } from '../../api/client'
import type { Shipment, Box, Rack } from '../../api/types'
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type Tab = 'scanner' | 'list'
type ScanEntity = 'shipment' | 'rack' | 'unknown'
type MoveReason = 'rearrange' | 'consolidate' | 'damage' | 'relocate' | 'other'

interface ScanResult {
  type: ScanEntity
  value: string
  shipment?: Shipment
  rack?: Rack
  timestamp: number
}

interface PhotoFile {
  id: string
  file: File
  preview: string
  uploaded: boolean
  url?: string
}

interface MoveHistoryEntry {
  id: string
  fromRackCode: string
  toRackCode: string
  reason: string
  authorizedBy?: string
  notes?: string
  createdAt: string
  photos?: string[]
}

// ═══════════════════════════════════════════════════════════════
// Sound Effects (Web Audio API)
// ═══════════════════════════════════════════════════════════════

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not supported
  }
}

function playSuccess(): void {
  playTone(800, 0.3, 'sine', 0.3)
}

function playError(): void {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => playTone(200, 0.15, 'square', 0.4), i * 200)
  }
}

function playWarning(): void {
  playTone(400, 0.8, 'triangle', 0.25)
}

// ═══════════════════════════════════════════════════════════════
// Photo Compression
// ═══════════════════════════════════════════════════════════════

const MAX_PHOTO_DIMENSION = 1920
const JPEG_QUALITY = 0.85

async function compressPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
        const ratio = Math.min(MAX_PHOTO_DIMENSION / width, MAX_PHOTO_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

// ═══════════════════════════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════════════════════════

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function isShipmentId(value: string): boolean {
  return /^[a-f0-9-]{20,}$/i.test(value) || /^SHP\d{6,}/i.test(value)
}

function isRackCode(value: string): boolean {
  return /^R[A-Z0-9]{2,}/i.test(value) || /^[A-Z]{2,}-\d{2,}/i.test(value)
}

// ═══════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════

function ScanHistory({ history }: { history: ScanResult[] }) {
  if (history.length === 0) return null
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
        <ClipboardList className="w-4 h-4" />
        Scan History
      </h3>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {history.map((h, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
              h.type === 'shipment'
                ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                : h.type === 'rack'
                ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400'
                : 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400'
            )}
          >
            {h.type === 'shipment' ? (
              <Package className="w-3.5 h-3.5 flex-shrink-0" />
            ) : h.type === 'rack' ? (
              <Ruler className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span className="font-mono truncate flex-1">{h.value}</span>
            <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
              {new Date(h.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      {text && <span className="text-sm text-gray-500">{text}</span>}
    </div>
  )
}

function PhotoUploader({
  photos,
  onAdd,
  onRemove,
  maxPhotos = 4,
}: {
  photos: PhotoFile[]
  onAdd: (files: FileList) => void
  onRemove: (id: string) => void
  maxPhotos?: number
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        Photos
      </label>
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
            <img
              src={p.preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(p.id)}
              className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
          >
            <Plus className="w-6 h-6 text-gray-400" />
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onAdd(e.target.files)}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Rack Selector Modal
// ═══════════════════════════════════════════════════════════════

function RackSelectorModal({
  open,
  onClose,
  onSelect,
  title = 'Select Rack',
}: {
  open: boolean
  onClose: () => void
  onSelect: (rack: Rack) => void
  title?: string
}) {
  const [racks, setRacks] = useState<Rack[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    setRacks([])
    setSearch('')
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!open) return
      setLoading(true)
      try {
        const res = await racksAPI.getAll({ search: search || undefined })
        setRacks(res.racks || [])
      } catch (err) {
        console.error('Failed to load racks:', err)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search racks by code or zone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-white"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <LoadingSpinner text="Searching racks..." />
          ) : racks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No racks found</p>
          ) : (
            <div className="space-y-2">
              {racks.map((rack) => (
                <button
                  key={rack.id}
                  type="button"
                  onClick={() => onSelect(rack)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <Ruler className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{rack.code}</div>
                      <div className="text-xs text-gray-500">{rack.zone || rack.section || rack.location || 'No zone'}</div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {rack.cbmCapacity ? `${(rack.cbmUsed || 0).toFixed(1)}/${rack.cbmCapacity.toFixed(1)} CBM` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Assignment Modal
// ═══════════════════════════════════════════════════════════════

function AssignmentModal({
  open,
  onClose,
  shipment,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  shipment: Shipment
  onSuccess: () => void
}) {
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null)
  const [showRackSelector, setShowRackSelector] = useState(false)
  const [boxCount, setBoxCount] = useState(shipment.totalBoxes || 1)
  const [palletQuantity, setPalletQuantity] = useState(shipment.palletCount || 0)
  const [looseBoxQuantity, setLooseBoxQuantity] = useState(0)
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleAddPhotos = async (files: FileList) => {
    const newPhotos: PhotoFile[] = []
    for (const file of Array.from(files)) {
      if (photos.length + newPhotos.length >= 4) break
      try {
        const compressed = await compressPhoto(file)
        const compressedFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
        newPhotos.push({
          id: generateId(),
          file: compressedFile,
          preview: URL.createObjectURL(compressed),
          uploaded: false,
        })
      } catch {
        newPhotos.push({
          id: generateId(),
          file,
          preview: URL.createObjectURL(file),
          uploaded: false,
        })
      }
    }
    setPhotos((prev) => [...prev, ...newPhotos])
  }

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id)
      if (p) URL.revokeObjectURL(p.preview)
      return prev.filter((x) => x.id !== id)
    })
  }

  const handleSubmit = async () => {
    if (!selectedRack) {
      setError('Please select a rack')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      // Upload photos first
      const photoUrls: string[] = []
      for (const p of photos) {
        const formData = new FormData()
        formData.append('photo', p.file)
        formData.append('type', 'assignment')
        try {
          const result = await uploadAPI.upload(formData, 'assignment')
          photoUrls.push(result.url)
        } catch {
          // Continue even if photo upload fails
        }
      }

      await shipmentsAPI.assignBoxes(shipment.id, {
        rackId: selectedRack.id,
        boxCount,
        palletQuantity,
        looseBoxQuantity,
        photos: photoUrls,
      })
      playSuccess()
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Assignment failed')
      playError()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign to Rack</h3>
            <p className="text-sm text-gray-500 mt-1">
              {shipment.trackingNumber || shipment.id.slice(0, 8)}
              {' · '}
              {shipment.clientName || 'Unknown Client'}
            </p>
          </div>
          <div className="p-4 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Rack Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Destination Rack <span className="text-red-500">*</span>
              </label>
              {selectedRack ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-indigo-500" />
                    <div>
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{selectedRack.code}</span>
                      <span className="text-xs text-gray-500 ml-2">{selectedRack.zone || ''}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRack(null)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRackSelector(true)}
                  className="w-full p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Select Rack
                </button>
              )}
            </div>

            {/* Box Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Box Count to Assign
              </label>
              <input
                type="number"
                min={1}
                max={shipment.totalBoxes || 999}
                value={boxCount}
                onChange={(e) => setBoxCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Max: {shipment.totalBoxes || 'N/A'} boxes</p>
            </div>

            {/* Pallet Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Pallet Quantity
              </label>
              <input
                type="number"
                min={0}
                value={palletQuantity}
                onChange={(e) => setPalletQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-white"
              />
            </div>

            {/* Loose Box Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Loose Box Quantity
              </label>
              <input
                type="number"
                min={0}
                value={looseBoxQuantity}
                onChange={(e) => setLooseBoxQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-white"
              />
            </div>

            {/* Photos */}
            <PhotoUploader
              photos={photos}
              onAdd={handleAddPhotos}
              onRemove={handleRemovePhoto}
            />

            {/* Shipment Info Summary */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs space-y-1 text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Status</span>
                <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', getStatusColor(shipment.status))}>
                  {getStatusLabel(shipment.status)}
                </span>
              </div>
              {shipment.totalCBM && (
                <div className="flex justify-between">
                  <span>Total CBM</span>
                  <span>{shipment.totalCBM.toFixed(2)} m³</span>
                </div>
              )}
              {shipment.totalWeight && (
                <div className="flex justify-between">
                  <span>Total Weight</span>
                  <span>{shipment.totalWeight} kg</span>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedRack}
              className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {selectedRack ? `Assign to ${selectedRack.code}` : 'Select Rack'}
            </button>
          </div>
        </div>
      </div>
      <RackSelectorModal
        open={showRackSelector}
        onClose={() => setShowRackSelector(false)}
        onSelect={(rack) => {
          setSelectedRack(rack)
          setShowRackSelector(false)
        }}
        title="Select Destination Rack"
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// Move Shipment Modal
// ═══════════════════════════════════════════════════════════════

function MoveShipmentModal({
  open,
  onClose,
  shipment,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  shipment: Shipment
  onSuccess: () => void
}) {
  const [sourceRack, setSourceRack] = useState<Rack | null>(null)
  const [destRack, setDestRack] = useState<Rack | null>(null)
  const [showDestSelector, setShowDestSelector] = useState(false)
  const [reason, setReason] = useState<MoveReason>('rearrange')
  const [authorizedBy, setAuthorizedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([])

  // Load source rack info
  useEffect(() => {
    if (!open || !shipment.rackId) return
    racksAPI.getById(shipment.rackId)
      .then((res) => setSourceRack(res.rack))
      .catch(() => {})
  }, [open, shipment.rackId])

  // Load authorized users
  useEffect(() => {
    if (!open) return
    usersAPI.getAuthorized()
      .then((res) => setAuthorizedUsers(res.users || []))
      .catch(() => {})
  }, [open])

  // Load move history
  useEffect(() => {
    if (!open || !showHistory) return
    setLoadingHistory(true)
    shipmentsAPI.getMoveHistory(shipment.id)
      .then((res) => setMoveHistory(res.moves || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [open, showHistory, shipment.id])

  const handleAddPhotos = async (files: FileList) => {
    const newPhotos: PhotoFile[] = []
    for (const file of Array.from(files)) {
      if (photos.length + newPhotos.length >= 4) break
      try {
        const compressed = await compressPhoto(file)
        const compressedFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
        newPhotos.push({
          id: generateId(),
          file: compressedFile,
          preview: URL.createObjectURL(compressed),
          uploaded: false,
        })
      } catch {
        newPhotos.push({
          id: generateId(),
          file,
          preview: URL.createObjectURL(file),
          uploaded: false,
        })
      }
    }
    setPhotos((prev) => [...prev, ...newPhotos])
  }

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id)
      if (p) URL.revokeObjectURL(p.preview)
      return prev.filter((x) => x.id !== id)
    })
  }

  const handleSubmit = async () => {
    if (!destRack) {
      setError('Please select a destination rack')
      return
    }
    if (!sourceRack && !shipment.rackId) {
      setError('No source rack found for this shipment')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const photoUrls: string[] = []
      for (const p of photos) {
        const formData = new FormData()
        formData.append('photo', p.file)
        formData.append('type', 'move')
        try {
          const result = await uploadAPI.upload(formData, 'move')
          photoUrls.push(result.url)
        } catch {
          // continue
        }
      }

      await shipmentsAPI.moveBoxes(shipment.id, {
        fromRackId: sourceRack?.id || shipment.rackId,
        toRackId: destRack.id,
        reason,
        authorizedBy: authorizedBy || undefined,
        notes: notes || undefined,
        photos: photoUrls,
      })
      playSuccess()
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Move failed')
      playError()
    } finally {
      setSubmitting(false)
    }
  }

  const reasonLabels: Record<MoveReason, string> = {
    rearrange: 'Rearrange / Reorganize',
    consolidate: 'Consolidate Shipments',
    damage: 'Damage / Inspection',
    relocate: 'Relocate to Different Zone',
    other: 'Other',
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Move Shipment</h3>
            <p className="text-sm text-gray-500 mt-1">
              {shipment.trackingNumber || shipment.id.slice(0, 8)}
              {' · '}
              {shipment.clientName || 'Unknown Client'}
            </p>
          </div>
          <div className="p-4 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Source Rack */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Source Rack (Current)
              </label>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <MapPin className="w-4 h-4 text-gray-400" />
                {sourceRack ? (
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{sourceRack.code}</span>
                    <span className="text-gray-500 ml-2">{sourceRack.zone || ''}</span>
                  </div>
                ) : shipment.rackCode ? (
                  <span className="text-sm text-gray-700 dark:text-gray-300">{shipment.rackCode}</span>
                ) : (
                  <span className="text-sm text-gray-400">Auto-detected (loading...)</span>
                )}
              </div>
            </div>

            {/* Destination Rack */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Destination Rack <span className="text-red-500">*</span>
              </label>
              {destRack ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-indigo-500" />
                    <div>
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{destRack.code}</span>
                      <span className="text-xs text-gray-500 ml-2">{destRack.zone || ''}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDestRack(null)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDestSelector(true)}
                    className="flex-1 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Browse Racks
                  </button>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Reason for Move <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as MoveReason)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-white"
              >
                {Object.entries(reasonLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Authorized By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Authorized By
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  placeholder="Name of authorizing person"
                  list="authorized-users"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-white"
                />
                <datalist id="authorized-users">
                  {authorizedUsers.map((u: any) => (
                    <option key={u.id} value={u.name || u.email} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional notes about this move..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none dark:text-white"
              />
            </div>

            {/* Photos */}
            <PhotoUploader
              photos={photos}
              onAdd={handleAddPhotos}
              onRemove={handleRemovePhoto}
            />

            {/* Move History */}
            <div>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <FileText className="w-4 h-4" />
                Move History
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showHistory && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5">
                  {loadingHistory ? (
                    <LoadingSpinner text="Loading history..." />
                  ) : moveHistory.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">No move history available</p>
                  ) : (
                    moveHistory.map((m) => (
                      <div key={m.id} className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-gray-800/50 text-xs">
                        <Move className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{m.fromRackCode}</span>
                            <ArrowRight className="w-3 h-3 inline mx-1" />
                            <span className="font-medium">{m.toRackCode}</span>
                          </div>
                          <div className="text-gray-500">{m.reason}{m.authorizedBy ? ` · ${m.authorizedBy}` : ''}</div>
                          <div className="text-gray-400">{formatDate(m.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !destRack}
              className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {destRack ? `Move to ${destRack.code}` : 'Select Destination'}
            </button>
          </div>
        </div>
      </div>
      <RackSelectorModal
        open={showDestSelector}
        onClose={() => setShowDestSelector(false)}
        onSelect={(rack) => {
          setDestRack(rack)
          setShowDestSelector(false)
        }}
        title="Select Destination Rack"
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// Shipment Info Card
// ═══════════════════════════════════════════════════════════════

function ShipmentInfoCard({
  shipment,
  onAssign,
  onMove,
  onViewDetails,
  onClear,
}: {
  shipment: Shipment
  onAssign: () => void
  onMove: () => void
  onViewDetails: () => void
  onClear: () => void
}) {
  const canAssign = ['PENDING', 'PARTIAL'].includes(shipment.status)
  const canMove = ['IN_STORAGE', 'ACTIVE'].includes(shipment.status)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-green-200 dark:border-green-800 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-green-50 dark:bg-green-900/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">Shipment Found</span>
        </div>
        <button
          onClick={onClear}
          className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <XCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            {shipment.trackingNumber || 'No Tracking #'}
          </h4>
          <p className="text-sm text-gray-500">{shipment.clientName || 'Unknown Client'}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
            <span className="text-gray-500">Status</span>
            <div className={cn('mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium inline-block', getStatusColor(shipment.status))}>
              {getStatusLabel(shipment.status)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
            <span className="text-gray-500">Boxes</span>
            <p className="font-medium text-gray-900 dark:text-white mt-0.5">{shipment.totalBoxes || '-'}</p>
          </div>
          {shipment.totalCBM && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <span className="text-gray-500">CBM</span>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{shipment.totalCBM.toFixed(2)} m³</p>
            </div>
          )}
          {shipment.currentBoxCount !== undefined && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <span className="text-gray-500">Stored</span>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{shipment.currentBoxCount}</p>
            </div>
          )}
          {shipment.rackCode && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 col-span-2">
              <span className="text-gray-500">Current Rack</span>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-indigo-500" />
                {shipment.rackCode}
                {shipment.rackLocation && <span className="text-gray-500">({shipment.rackLocation})</span>}
              </p>
            </div>
          )}
        </div>

        {shipment.receivedDate && (
          <p className="text-xs text-gray-500">Received: {formatDate(shipment.receivedDate)}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        {canAssign && (
          <button
            onClick={onAssign}
            className="flex-1 py-2.5 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Package className="w-4 h-4" />
            Assign to Rack
          </button>
        )}
        {canMove && (
          <button
            onClick={onMove}
            className="flex-1 py-2.5 px-3 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Move className="w-4 h-4" />
            Move to Another Rack
          </button>
        )}
        <button
          onClick={onViewDetails}
          className="py-2.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Info className="w-4 h-4" />
          Details
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Rack Info Card
// ═══════════════════════════════════════════════════════════════

function RackInfoCard({
  rack,
  onViewContents,
  onUseInAssignment,
  onClear,
}: {
  rack: Rack
  onViewContents: () => void
  onUseInAssignment: () => void
  onClear: () => void
}) {
  const capacityPercent = rack.capacityTotal && rack.capacityTotal > 0
    ? Math.round(((rack.capacityUsed || 0) / rack.capacityTotal) * 100)
    : 0
  const cbmPercent = rack.cbmCapacity && rack.cbmCapacity > 0
    ? Math.round(((rack.cbmUsed || 0) / rack.cbmCapacity) * 100)
    : 0

  const capacityColor = capacityPercent >= 90 ? 'text-red-600 dark:text-red-400' : capacityPercent >= 70 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
  const cbmColor = cbmPercent >= 90 ? 'text-red-600 dark:text-red-400' : cbmPercent >= 70 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">Rack Found</span>
        </div>
        <button onClick={onClear} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <XCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{rack.code}</h4>
          <p className="text-sm text-gray-500">{rack.name || rack.zone || rack.section || rack.location || 'No description'}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {rack.zone && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <span className="text-gray-500">Zone</span>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{rack.zone}</p>
            </div>
          )}
          {rack.category && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <span className="text-gray-500">Category</span>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{rack.category}</p>
            </div>
          )}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
            <span className="text-gray-500">Status</span>
            <div className={cn('mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium inline-block', getStatusColor(rack.status))}>
              {getStatusLabel(rack.status)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
            <span className="text-gray-500">Capacity</span>
            <p className={cn('font-medium mt-0.5', capacityColor)}>
              {rack.capacityUsed || 0} / {rack.capacityTotal || 'N/A'} ({capacityPercent}%)
            </p>
          </div>
          {rack.cbmCapacity !== undefined && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <span className="text-gray-500">CBM</span>
              <p className={cn('font-medium mt-0.5', cbmColor)}>
                {(rack.cbmUsed || 0).toFixed(1)} / {rack.cbmCapacity.toFixed(1)} ({cbmPercent}%)
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={onViewContents}
          className="flex-1 py-2.5 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Package className="w-4 h-4" />
          View Contents
        </button>
        <button
          onClick={onUseInAssignment}
          className="flex-1 py-2.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Package className="w-4 h-4" />
          Use in Assignment
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Rack Contents Modal
// ═══════════════════════════════════════════════════════════════

function RackContentsModal({
  open,
  onClose,
  rack,
}: {
  open: boolean
  onClose: () => void
  rack: Rack
}) {
  const [contents, setContents] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    // Fetch shipments in this rack
    shipmentsAPI.getAll({ search: rack.code })
      .then((res) => {
        const shipments = res.shipments || []
        setContents(shipments.filter((s: Shipment) => s.rackId === rack.id || s.rackCode === rack.code))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, rack.id, rack.code])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Contents: {rack.code}
          </h3>
          {rack.zone && <p className="text-sm text-gray-500 mt-1">{rack.zone}</p>}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <LoadingSpinner text="Loading contents..." />
          ) : contents.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No shipments currently stored in this rack</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {s.trackingNumber || s.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-gray-500">{s.clientName || 'Unknown'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', getStatusColor(s.status))}>
                      {getStatusLabel(s.status)}
                    </span>
                    <span className="text-xs text-gray-500">{s.totalBoxes || '-'} boxes</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Shipment Details Modal
// ═══════════════════════════════════════════════════════════════

function ShipmentDetailsModal({
  open,
  onClose,
  shipment,
}: {
  open: boolean
  onClose: () => void
  shipment: Shipment
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Shipment Details</h3>
            <p className="text-sm text-gray-500">{shipment.trackingNumber || 'No Tracking'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <div className={cn('px-2 py-1 rounded text-xs font-medium', getStatusColor(shipment.status))}>
              {getStatusLabel(shipment.status)}
            </div>
            <span className="text-xs text-gray-500">ID: {shipment.id.slice(0, 12)}...</span>
          </div>

          {/* Client Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <h4 className="font-medium text-gray-900 dark:text-white">Client Information</h4>
            {shipment.clientName && <p className="text-gray-600 dark:text-gray-400">Name: {shipment.clientName}</p>}
            {shipment.clientPhone && <p className="text-gray-600 dark:text-gray-400">Phone: {shipment.clientPhone}</p>}
            {shipment.clientEmail && <p className="text-gray-600 dark:text-gray-400">Email: {shipment.clientEmail}</p>}
          </div>

          {/* Shipping Info */}
          {(shipment.shipperName || shipment.consigneeName || shipment.origin || shipment.destination) && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
              <h4 className="font-medium text-gray-900 dark:text-white">Shipping Information</h4>
              {shipment.shipperName && <p className="text-gray-600 dark:text-gray-400">Shipper: {shipment.shipperName}</p>}
              {shipment.consigneeName && <p className="text-gray-600 dark:text-gray-400">Consignee: {shipment.consigneeName}</p>}
              {shipment.origin && <p className="text-gray-600 dark:text-gray-400">Origin: {shipment.origin}</p>}
              {shipment.destination && <p className="text-gray-600 dark:text-gray-400">Destination: {shipment.destination}</p>}
            </div>
          )}

          {/* Cargo Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
            <h4 className="font-medium text-gray-900 dark:text-white">Cargo Information</h4>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-gray-500">Total Boxes:</span> <span className="text-gray-900 dark:text-white">{shipment.totalBoxes || '-'}</span></div>
              <div><span className="text-gray-500">Stored Boxes:</span> <span className="text-gray-900 dark:text-white">{shipment.currentBoxCount ?? '-'}</span></div>
              {shipment.palletCount !== undefined && <div><span className="text-gray-500">Pallets:</span> <span className="text-gray-900 dark:text-white">{shipment.palletCount}</span></div>}
              {shipment.totalCBM !== undefined && <div><span className="text-gray-500">Total CBM:</span> <span className="text-gray-900 dark:text-white">{shipment.totalCBM.toFixed(2)} m³</span></div>}
              {shipment.totalWeight !== undefined && <div><span className="text-gray-500">Total Weight:</span> <span className="text-gray-900 dark:text-white">{shipment.totalWeight} kg</span></div>}
              {shipment.estimatedValue !== undefined && <div><span className="text-gray-500">Est. Value:</span> <span className="text-gray-900 dark:text-white">{formatCurrency(shipment.estimatedValue)}</span></div>}
            </div>
          </div>

          {/* Storage Info */}
          {shipment.storageType && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm">
              <span className="text-gray-500">Storage Type:</span>
              <span className="text-gray-900 dark:text-white ml-2">{shipment.storageType}</span>
            </div>
          )}

          {/* Rack */}
          {shipment.rackCode && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm">
              <span className="text-gray-500">Current Rack:</span>
              <span className="text-gray-900 dark:text-white ml-2 font-medium">{shipment.rackCode}</span>
              {shipment.rackLocation && <span className="text-gray-500 ml-1">({shipment.rackLocation})</span>}
            </div>
          )}

          {/* Dates */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1 text-sm">
            <h4 className="font-medium text-gray-900 dark:text-white">Dates</h4>
            <p className="text-gray-600 dark:text-gray-400">Created: {formatDate(shipment.createdAt)}</p>
            {shipment.receivedDate && <p className="text-gray-600 dark:text-gray-400">Received: {formatDate(shipment.receivedDate)}</p>}
            {shipment.arrivalDate && <p className="text-gray-600 dark:text-gray-400">Arrival: {formatDate(shipment.arrivalDate)}</p>}
          </div>

          {/* Notes */}
          {shipment.notes && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm">
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Notes</h4>
              <p className="text-gray-600 dark:text-gray-400">{shipment.notes}</p>
            </div>
          )}

          {/* Warehouse Notes */}
          {shipment.warehouseNotes && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm">
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Warehouse Notes</h4>
              <p className="text-gray-600 dark:text-gray-400">{shipment.warehouseNotes}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Pending Shipments List Tab
// ═══════════════════════════════════════════════════════════════

function PendingShipmentsList({
  onShipmentSelect,
}: {
  onShipmentSelect: (shipment: Shipment, action: 'assign' | 'move') => void
}) {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadShipments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await shipmentsAPI.getAll({ status: 'PENDING,PARTIAL', limit: 50 })
      setShipments(res.shipments || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load shipments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShipments()
  }, [loadShipments])

  if (loading) {
    return <LoadingSpinner text="Loading pending shipments..." />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        <button
          onClick={loadShipments}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  if (shipments.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">No Pending Shipments</h3>
        <p className="text-sm text-gray-400 mt-1">All shipments have been assigned to racks</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {shipments.length} shipment{shipments.length !== 1 ? 's' : ''} pending rack assignment
        </p>
        <button
          onClick={loadShipments}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RotateCcw className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      {shipments.map((s) => {
        const isPartial = s.status === 'PARTIAL'
        return (
          <div
            key={s.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(s.status))}>
                      {getStatusLabel(s.status)}
                    </span>
                    {s.isWarehouseShipment && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        Warehouse
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-base">
                    {s.trackingNumber || s.id.slice(0, 8)}
                  </h4>
                  {s.referenceId && (
                    <p className="text-xs text-gray-500">Ref: {s.referenceId}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{s.clientName || 'Unknown Client'}</p>
                </div>
                <button
                  onClick={() => onShipmentSelect(s, 'assign')}
                  className="flex-shrink-0 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-xs font-medium whitespace-nowrap flex items-center gap-1"
                >
                  <Package className="w-3.5 h-3.5" />
                  Choose Rack
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  {s.totalBoxes || 0} boxes
                </span>
                {s.currentBoxCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" />
                    {s.currentBoxCount} stored
                  </span>
                )}
                {s.totalCBM !== undefined && (
                  <span className="flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5" />
                    {s.totalCBM.toFixed(2)} CBM
                  </span>
                )}
                {s.totalWeight !== undefined && (
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {s.totalWeight} kg
                  </span>
                )}
                {s.palletCount !== undefined && s.palletCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {s.palletCount} pallets
                  </span>
                )}
              </div>

              {s.description && (
                <p className="mt-2 text-xs text-gray-400 line-clamp-1">{s.description}</p>
              )}

              {s.receivedDate && (
                <p className="mt-1 text-xs text-gray-400">Received: {formatDate(s.receivedDate)}</p>
              )}
            </div>

            {isPartial && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => onShipmentSelect(s, 'move')}
                  className="w-full py-2 px-3 rounded-lg border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <Move className="w-3.5 h-3.5" />
                  Move to Another Rack
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Camera Scanner View
// ═══════════════════════════════════════════════════════════════

function CameraScanner({
  onScanResult,
}: {
  onScanResult: (result: ScanResult) => void
}) {
  const [scanning, setScanning] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cooldownRef = useRef<Map<string, number>>(new Map())

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {
        // ignore
      }
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return
    setInitializing(true)
    setError('')
    try {
      const scanner = new (Html5Qrcode as any)('scanner-container')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string) => {
          // Cooldown check
          const now = Date.now()
          const lastScan = cooldownRef.current.get(decodedText) || 0
          if (now - lastScan < 3000) return // 3s cooldown
          cooldownRef.current.set(decodedText, now)

          playSuccess()

          // Try to resolve as shipment first, then rack
          let result: ScanResult = {
            type: 'unknown',
            value: decodedText,
            timestamp: now,
          }

          try {
            const shipmentRes = await shipmentsAPI.getById(decodedText)
            if (shipmentRes.shipment) {
              result = {
                type: 'shipment',
                value: decodedText,
                shipment: shipmentRes.shipment,
                timestamp: now,
              }
              onScanResult(result)
              return
            }
          } catch {
            // Not a shipment, try rack
          }

          try {
            const rackRes = await racksAPI.getAll({ search: decodedText })
            const rack = rackRes.racks?.find(
              (r: Rack) => r.code === decodedText || r.id === decodedText
            )
            if (rack) {
              result = {
                type: 'rack',
                value: decodedText,
                rack,
                timestamp: now,
              }
              onScanResult(result)
              return
            }
          } catch {
            // Not a rack either
          }

          // Unknown QR code
          playWarning()
          onScanResult(result)
        },
        () => {} // qr code lost callback - ignore
      )
      setScanning(true)
    } catch (err: any) {
      setError(err.message || 'Failed to start camera')
      playError()
    } finally {
      setInitializing(false)
    }
  }, [onScanResult])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  return (
    <div className="space-y-4">
      {/* Camera Controls */}
      {!scanning ? (
        <button
          onClick={startScanner}
          disabled={initializing}
          className="w-full py-4 px-6 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
        >
          {initializing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Camera className="w-6 h-6" />
          )}
          {initializing ? 'Starting Camera...' : 'Start Scanner'}
        </button>
      ) : (
        <button
          onClick={stopScanner}
          className="w-full py-4 px-6 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all text-lg font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
        >
          <CameraOff className="w-6 h-6" />
          Stop Scanner
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Scanner View */}
      {scanning && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-black">
          <div
            id="scanner-container"
            ref={containerRef}
            className="w-full aspect-[4/3] relative"
          />
        </div>
      )}

      {/* Hint */}
      {!scanning && !error && (
        <div className="text-center py-6">
          <ScanLine className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Press "Start Scanner" and point your camera at a QR code</p>
          <p className="text-xs text-gray-400 mt-1">Supports shipment IDs and rack codes</p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main Scanner Page
// ═══════════════════════════════════════════════════════════════

export default function ScannerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('scanner')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showShipmentDetails, setShowShipmentDetails] = useState(false)
  const [showRackContents, setShowRackContents] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<{ shipment: Shipment; action: 'assign' | 'move' } | null>(null)
  const { user } = useAuth()

  const handleScanResult = (result: ScanResult) => {
    setScanResult(result)
    setScanHistory((prev) => [result, ...prev].slice(0, 50))
  }

  const clearScanResult = () => {
    setScanResult(null)
  }

  const handleAssign = () => {
    if (scanResult?.shipment) {
      setShowAssignmentModal(true)
    }
  }

  const handleMove = () => {
    if (scanResult?.shipment) {
      setShowMoveModal(true)
    }
  }

  const handleViewDetails = () => {
    if (scanResult?.shipment) {
      setShowShipmentDetails(true)
    }
  }

  const handleViewRackContents = () => {
    if (scanResult?.rack) {
      setShowRackContents(true)
    }
  }

  const handleUseRackInAssignment = () => {
    if (scanResult?.rack) {
      // Switch to list tab or show toast indicating rack is ready for assignment
      // For now, show a notification
      setActiveTab('list')
      clearScanResult()
    }
  }

  const handlePendingShipmentSelect = (shipment: Shipment, action: 'assign' | 'move') => {
    setPendingSelection({ shipment, action })
    if (action === 'assign') {
      setShowAssignmentModal(true)
    } else {
      setShowMoveModal(true)
    }
  }

  const handleSuccess = () => {
    clearScanResult()
    setPendingSelection(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ScanLine className="w-7 h-7 text-indigo-500" />
          Scanner
        </h1>
        <p className="text-gray-500 mt-1">Scan QR codes to manage shipments and racks</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('scanner')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'scanner'
              ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          <Camera className="w-4 h-4" />
          Scanner
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'list'
              ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          <ClipboardList className="w-4 h-4" />
          Pending Shipments
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'scanner' ? (
        <div className="max-w-md mx-auto space-y-4">
          <CameraScanner onScanResult={handleScanResult} />

          {/* Scan Result */}
          {scanResult && scanResult.type === 'shipment' && scanResult.shipment && (
            <ShipmentInfoCard
              shipment={scanResult.shipment}
              onAssign={handleAssign}
              onMove={handleMove}
              onViewDetails={handleViewDetails}
              onClear={clearScanResult}
            />
          )}

          {scanResult && scanResult.type === 'rack' && scanResult.rack && (
            <RackInfoCard
              rack={scanResult.rack}
              onViewContents={handleViewRackContents}
              onUseInAssignment={handleUseRackInAssignment}
              onClear={clearScanResult}
            />
          )}

          {scanResult && scanResult.type === 'unknown' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-yellow-800 dark:text-yellow-300">Unknown QR Code</h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1 break-all">{scanResult.value}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                  This code doesn't match any shipment or rack in the system
                </p>
                <button
                  onClick={clearScanResult}
                  className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Scan History */}
          <ScanHistory history={scanHistory} />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <PendingShipmentsList onShipmentSelect={handlePendingShipmentSelect} />
        </div>
      )}

      {/* Modals */}
      {showAssignmentModal && (
        <AssignmentModal
          open={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false)
            setPendingSelection(null)
          }}
          shipment={pendingSelection?.shipment || scanResult?.shipment!}
          onSuccess={handleSuccess}
        />
      )}

      {showMoveModal && (
        <MoveShipmentModal
          open={showMoveModal}
          onClose={() => {
            setShowMoveModal(false)
            setPendingSelection(null)
          }}
          shipment={pendingSelection?.shipment || scanResult?.shipment!}
          onSuccess={handleSuccess}
        />
      )}

      {showShipmentDetails && scanResult?.shipment && (
        <ShipmentDetailsModal
          open={showShipmentDetails}
          onClose={() => setShowShipmentDetails(false)}
          shipment={scanResult.shipment}
        />
      )}

      {showRackContents && scanResult?.rack && (
        <RackContentsModal
          open={showRackContents}
          onClose={() => setShowRackContents(false)}
          rack={scanResult.rack}
        />
      )}
    </div>
  )
}

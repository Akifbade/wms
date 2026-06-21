// ──────────────────────────────────────────────
// WMS API Client – modern typed interface
// ──────────────────────────────────────────────

// ── Types ──────────────────────────────────────

export interface ShipmentBox {
  id: string;
  boxNumber?: number;
  status: string;
  rackId?: string;
  rack?: { code: string; location?: string };
}

export interface Shipment {
  id: string;
  name: string;
  referenceId: string;
  originalBoxCount: number;
  currentBoxCount: number;
  type: string;
  arrivalDate: string;
  clientName: string;
  clientPhone: string;
  status: string;
  customerName: string;
  cbm: number;
  weight: number;
  palletCount: number;
  boxesPerPallet: number;
  notes: string;
  createdAt: string;
  boxes: ShipmentBox[];
  companyProfile?: { name: string };
  createdBy?: { id: string; name: string };
  rackLocations?: string;
  inStorageBoxes?: number;
  releasedBoxes?: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FetchShipmentsResponse {
  shipments: Shipment[];
  pagination: Pagination;
}

// ── Helpers ────────────────────────────────────

function getAuthToken(): string | null {
  return localStorage.getItem('authToken') ?? localStorage.getItem('token');
}

// ── Core request ───────────────────────────────

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: { ...headers, ...((options?.headers as Record<string, string>) || {}) },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return res.json();
}

// ── Public API surface ─────────────────────────

/**
 * Fetch a paginated, filtered list of shipments.
 */
export async function fetchShipments(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<FetchShipmentsResponse> {
  const query = new URLSearchParams();
  if (params?.page != null) query.set('page', String(params.page));
  if (params?.limit != null) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return apiRequest<FetchShipmentsResponse>(`/shipments${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch a single shipment by ID.
 */
export async function fetchShipment(id: string): Promise<Shipment> {
  const data = await apiRequest<{ shipment: Shipment }>(`/shipments/${id}`);
  return data.shipment;
}

/**
 * Fetch boxes for a shipment.
 */
export async function fetchShipmentBoxes(shipmentId: string): Promise<ShipmentBox[]> {
  const data = await apiRequest<{ boxes: ShipmentBox[] }>(`/shipments/${shipmentId}/boxes`);
  return data.boxes || [];
}

/**
 * Fetch all moving jobs with optional filters.
 * Maps API fields (jobAddress→origin, dropoffAddress→destination) for frontend compatibility.
 */
export async function fetchJobs(params?: {
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ jobs: any[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  const qs = query.toString();
  const jobs = await apiRequest<any[]>(`/moving-jobs${qs ? `?${qs}` : ''}`);
  const mappedJobs = (jobs || []).map((j: any) => ({
    ...j,
    origin: j.jobAddress || j.origin || '',
    destination: j.dropoffAddress || j.destination || '',
  }));
  return { jobs: mappedJobs };
}

/**
 * Fetch a single moving job by ID.
 */
export async function fetchJob(id: string): Promise<{ job: any }> {
  const result = await apiRequest<{ job: any }>(`/moving-jobs/${id}`);
  if (result.job) {
    result.job.origin = result.job.jobAddress || result.job.origin || '';
    result.job.destination = result.job.dropoffAddress || result.job.destination || '';
  }
  return result;
}

import { useCallback } from 'react';

const API = '/api/materials-v3';

async function req(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const matV3 = {
  // materials
  listMaterials: () => req('/materials'),
  createMaterial: (body: any) => req('/materials', { method: 'POST', body: JSON.stringify(body) }),
  updateMaterial: (id: string, body: any) => req(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMaterial: (id: string, reason: string) =>
    req(`/materials/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),

  // purchases
  listPurchases: () => req('/purchases'),
  createPurchase: (body: any) => req('/purchases', { method: 'POST', body: JSON.stringify(body) }),
  updatePurchase: (id: string, body: any) => req(`/purchases/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  voidPurchase: (id: string, reason: string) =>
    req(`/purchases/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),

  // stock
  stock: () => req('/stock'),
  adjustStock: (body: any) => req('/stock/adjust', { method: 'POST', body: JSON.stringify(body) }),

  // jobs
  jobMaterials: (jobId: string) => req(`/jobs/${jobId}/materials`),
  packingList: (jobId: string) => req(`/jobs/${jobId}/packing-list`),
  addJobLine: (jobId: string, body: any) => req(`/jobs/${jobId}/lines`, { method: 'POST', body: JSON.stringify(body) }),
  updateJobLine: (jobId: string, lineId: string, body: any) =>
    req(`/jobs/${jobId}/lines/${lineId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteJobLine: (jobId: string, lineId: string, reason: string) =>
    req(`/jobs/${jobId}/lines/${lineId}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  saveJobFinance: (jobId: string, body: any) => req(`/jobs/${jobId}/finance`, { method: 'PUT', body: JSON.stringify(body) }),
  jobReport: (jobId: string) => req(`/jobs/${jobId}/report`),
  closeJob: (jobId: string, body: any) => req(`/jobs/${jobId}/close`, { method: 'POST', body: JSON.stringify(body) }),
  reopenJob: (jobId: string, reason: string) =>
    req(`/jobs/${jobId}/reopen`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // reports
  statement: (params: { startDate?: string; endDate?: string; materialId?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.materialId) q.set('materialId', params.materialId);
    const qs = q.toString();
    return req(`/statement${qs ? `?${qs}` : ''}`);
  },
  audit: (params: { startDate?: string; endDate?: string; entityType?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.entityType) q.set('entityType', params.entityType);
    const qs = q.toString();
    return req(`/audit${qs ? `?${qs}` : ''}`);
  },
  jobActivity: (params: { startDate?: string; endDate?: string; jobId?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.jobId) q.set('jobId', params.jobId);
    const qs = q.toString();
    return req(`/job-activity${qs ? `?${qs}` : ''}`);
  },

  /** Upload a filled/scanned packing list onto the job. */
  async attachPackingList(jobId: string, file: File) {
    const token = localStorage.getItem('authToken');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/jobs/${jobId}/packing-list/attachment`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Upload failed');
    return data;
  },
};

export function useMatV3() {
  const run = useCallback(async (fn: () => Promise<any>, onError?: (m: string) => void) => {
    try {
      return await fn();
    } catch (e: any) {
      const msg = e?.message || 'Something went wrong';
      if (onError) onError(msg);
      else alert(msg);
      return null;
    }
  }, []);
  return run;
}

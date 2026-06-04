import type { 
  User, Company, Rack, RackCategory,
  Shipment, ShipmentDimension,
  MovingJob, Withdrawal, Expense,
  CustomField,
} from '../types/entities';

// API configuration
const API_BASE_URL = '/api';

// Helper to get the backend base URL for uploads (works in both local and production)
export const getBackendUrl = (): string => {
  // In production, use the same domain (nginx proxies to backend)
  // In local development, use localhost:5000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return ''; // Use relative path in production (nginx handles routing)
};

// Wrapper function for fetch calls to handle backend URL routing
export const apiFetch = (endpoint: string, options?: RequestInit): Promise<Response> => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api${endpoint}`;
  return fetch(url, options);
};

// Helper to get auth token
export const getAuthToken = (): string | null => {
  const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token');

  if (storedToken && !localStorage.getItem('authToken')) {
    localStorage.setItem('authToken', storedToken);
  }

  return storedToken;
};

// Helper to set auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('token', token);
};

// Helper to clear auth token
export const clearAuthToken = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Helper to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('API Error:', error);
    throw error;
  }
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiCall<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    return response;
  },

  register: async (data: { email: string; password: string; name: string; companyId: string }) => {
    const response = await apiCall<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    return response;
  },

  me: async () => {
    return apiCall<{ user: User }>('/auth/me');
  },

  logout: () => {
    clearAuthToken();
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    return apiCall<unknown>('/dashboard/stats');
  },
};

// Shipments API
export const shipmentsAPI = {
  getAll: async (params?: { status?: string; search?: string; page?: number; limit?: number; isWarehouseShipment?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.isWarehouseShipment !== undefined) queryParams.append('isWarehouseShipment', String(params.isWarehouseShipment));

    const query = queryParams.toString();
    return apiCall<unknown>(`/shipments${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiCall<{ shipment: Shipment }>(`/shipments/${id}`);
  },

  create: async (data: Record<string, unknown>) => {
    return apiCall<{ shipment: Shipment }>('/shipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Record<string, unknown>) => {
    return apiCall<{ shipment: Shipment }>(`/shipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiCall<{ message: string }>(`/shipments/${id}`, {
      method: 'DELETE',
    });
  },

  // Dimensions API - Multiple dimensions per shipment
  getDimensions: async (shipmentId: string) => {
    return apiCall<{ dimensions: ShipmentDimension[]; summary: Record<string, unknown> }>(`/shipments/${shipmentId}/dimensions`);
  },

  addDimension: async (shipmentId: string, data: Record<string, unknown>) => {
    return apiCall<{ dimension: ShipmentDimension }>(`/shipments/${shipmentId}/dimensions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDimension: async (shipmentId: string, dimensionId: string, data: Record<string, unknown>) => {
    return apiCall<{ dimension: ShipmentDimension }>(`/shipments/${shipmentId}/dimensions/${dimensionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteDimension: async (shipmentId: string, dimensionId: string) => {
    return apiCall<{ message: string }>(`/shipments/${shipmentId}/dimensions/${dimensionId}`, {
      method: 'DELETE',
    });
  },

  saveDimensionsBulk: async (shipmentId: string, dimensions: any[]) => {
    return apiCall<{ dimensions: ShipmentDimension[]; summary: Record<string, unknown> }>(`/shipments/${shipmentId}/dimensions/bulk`, {
      method: 'POST',
      body: JSON.stringify({ dimensions }),
    });
  },

  // 🎯 NEW: Dimension Rack Assignment APIs
  getDimensionsStatus: async (shipmentId: string) => {
    return apiCall<{ dimensions: ShipmentDimension[]; summary: Record<string, unknown> }>(`/shipments/${shipmentId}/dimensions/status`);
  },

  assignDimensionToRack: async (shipmentId: string, dimensionId: string, rackId: string) => {
    return apiCall<unknown>(`/shipments/${shipmentId}/dimensions/${dimensionId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ rackId }),
    });
  },

  releaseDimension: async (shipmentId: string, dimensionId: string) => {
    return apiCall<unknown>(`/shipments/${shipmentId}/dimensions/${dimensionId}/release`, {
      method: 'POST',
    });
  },

  bulkAssignDimensions: async (shipmentId: string, dimensionIds: string[], rackId: string) => {
    return apiCall<unknown>(`/shipments/${shipmentId}/dimensions/bulk-assign`, {
      method: 'POST',
      body: JSON.stringify({ dimensionIds, rackId }),
    });
  },
};

// Racks API
export const racksAPI = {
  getAll: async (params?: { status?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return apiCall<{ racks: Rack[] }>(`/racks${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiCall<{ rack: Rack }>(`/racks/${id}`);
  },

  getCategories: async () => {
    return apiCall<{ categories: RackCategory[] }>('/racks/categories/list');
  },

  create: async (data: Record<string, unknown>) => {
    return apiCall<{ rack: Rack }>('/racks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Record<string, unknown>) => {
    return apiCall<{ rack: Rack }>(`/racks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiCall<{ message: string }>(`/racks/${id}`, {
      method: 'DELETE',
    });
  },
};

// NEW: Categories API
export const categoriesAPI = {
  listByCompany: async (companyId: string) => {
    const response = await apiCall<{ categories: RackCategory[] }>(`/categories/${companyId}`);
    return response.categories;
  },

  getDetail: async (categoryId: string) => {
    const response = await apiCall<{ category: RackCategory }>(`/categories/detail/${categoryId}`);
    return response.category;
  },

  create: async (data: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/categories/`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  update: async (categoryId: string, data: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  delete: async (categoryId: string) => {
    return apiCall<{ message: string }>(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },
};

// Company Profiles API (DIOR, JAZEERA, etc)
export const companiesAPI = {
  listProfiles: async () => {
    return apiCall<unknown[]>(`/company-profiles/`);
  },

  getProfile: async (profileId: string) => {
    return apiCall<unknown>(`/company-profiles/${profileId}`);
  },

  createProfile: async (data: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/company-profiles/`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  updateProfile: async (profileId: string, data: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/company-profiles/${profileId}`, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  deleteProfile: async (profileId: string) => {
    return apiCall<{ message: string }>(`/company-profiles/${profileId}`, {
      method: 'DELETE',
    });
  },
};

// Jobs API
export const jobsAPI = {
  getAll: async (params?: { status?: string; search?: string; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const query = queryParams.toString();
    const jobs = await apiCall<unknown[]>(`/moving-jobs${query ? `?${query}` : ''}`);
    return { jobs }; // Wrap in object for compatibility
  },

  getById: async (id: string) => {
    return apiCall<{ job: MovingJob }>(`/moving-jobs/${id}`);
  },

  create: async (data: Record<string, unknown>) => {
    return apiCall<{ job: MovingJob }>('/moving-jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Record<string, unknown>) => {
    return apiCall<{ job: MovingJob }>(`/moving-jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiCall<{ message: string }>(`/moving-jobs/${id}`, {
      method: 'DELETE',
    });
  },
};

// Billing API
export const billingAPI = {
  // Billing Settings
  getSettings: async () => {
    return apiCall<unknown>('/billing/settings');
  },

  updateSettings: async (settings: any) => {
    return apiCall<unknown>('/billing/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Charge Types
  getChargeTypes: async (params?: { category?: string; active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.active !== undefined) query.append('active', String(params.active));

    return apiCall<unknown[]>(`/billing/charge-types${query.toString() ? '?' + query.toString() : ''}`);
  },

  getChargeType: async (id: string) => {
    return apiCall<unknown>(`/billing/charge-types/${id}`);
  },

  createChargeType: async (chargeType: any) => {
    return apiCall<unknown>('/billing/charge-types', {
      method: 'POST',
      body: JSON.stringify(chargeType),
    });
  },

  updateChargeType: async (id: string, chargeType: any) => {
    return apiCall<unknown>(`/billing/charge-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(chargeType),
    });
  },

  deleteChargeType: async (id: string) => {
    return apiCall<{ message: string }>(`/billing/charge-types/${id}`, {
      method: 'DELETE',
    });
  },

  // Invoice endpoints
  getInvoices: async (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiCall<unknown[]>(`/billing/invoices${query ? '?' + query : ''}`);
  },

  getInvoice: async (id: string) => {
    return apiCall<unknown>(`/billing/invoices/${id}`);
  },

  createInvoice: async (invoice: any) => {
    return apiCall<unknown>('/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  },

  recordPayment: async (invoiceId: string, payment: any) => {
    return apiCall<unknown>(`/billing/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  },
};

// Withdrawals API
export const withdrawalsAPI = {
  getAll: async (params?: { status?: string; search?: string; startDate?: string; endDate?: string; shipmentId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.shipmentId) queryParams.append('shipmentId', params.shipmentId);

    const query = queryParams.toString();
    return apiCall<unknown>(`/withdrawals${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiCall<{ withdrawal: Withdrawal }>(`/withdrawals/${id}`);
  },

  create: async (data: Record<string, unknown>) => {
    return apiCall<{ withdrawal: Withdrawal; message: string }>('/withdrawals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (id: string, status: string) => {
    return apiCall<{ withdrawal: Withdrawal }>(`/withdrawals/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  delete: async (id: string) => {
    return apiCall<{ message: string }>(`/withdrawals/${id}`, {
      method: 'DELETE',
    });
  },
};

// Expense API
export const expensesAPI = {
  getAll: async (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    return apiCall<{ expenses: Expense[]; summary: Record<string, unknown> }>(`/expenses?${params}`, {
      method: 'GET',
    });
  },

  getById: async (id: string) => {
    return apiCall<{ expense: Expense }>(`/expenses/${id}`, {
      method: 'GET',
    });
  },

  create: async (data: Record<string, unknown>) => {
    return apiCall<{ expense: Expense }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Record<string, unknown>) => {
    return apiCall<{ expense: Expense }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiCall<{ message: string }>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  updateStatus: async (id: string, status: string) => {
    return apiCall<{ expense: Expense }>(`/expenses/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  getStats: async (dateRange?: any) => {
    const params = new URLSearchParams(dateRange).toString();
    return apiCall<{
      totalAmount: number;
      totalCount: number;
      byCategory: any;
      byStatus: any;
      currency: string;
    }>(`/expenses/stats/summary?${params}`, {
      method: 'GET',
    });
  },
};

// Company API
export const companyAPI = {
  getInfo: () => {
    return apiCall<{ company: Company }>('/company', {
      method: 'GET',
    });
  },
  updateInfo: (data: Record<string, unknown>) => {
    return apiCall<{ company: Company; message: string }>('/company', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Users API
export const usersAPI = {
  getAll: () => {
    return apiCall<{ users: User[] }>('/users', {
      method: 'GET',
    });
  },
  getById: (id: string) => {
    return apiCall<{ user: User }>(`/users/${id}`, {
      method: 'GET',
    });
  },
  create: (data: Record<string, unknown>) => {
    return apiCall<{ user: User; message: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: Record<string, unknown>) => {
    return apiCall<{ user: User; message: string }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) => {
    return apiCall<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
  toggleStatus: (id: string) => {
    return apiCall<{ user: User; message: string }>(`/users/${id}/toggle`, {
      method: 'PATCH',
    });
  },
};

// Invoice Settings API
export const invoiceSettingsAPI = {
  get: () => {
    return apiCall<{ settings: Record<string, unknown> }>('/invoice-settings', {
      method: 'GET',
    });
  },
  update: (data: Record<string, unknown>) => {
    return apiCall<{ settings: Record<string, unknown>; message: string }>('/invoice-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Notification Preferences API
export const notificationPreferencesAPI = {
  get: () => {
    return apiCall<{ preferences: Record<string, unknown> }>('/notification-preferences', {
      method: 'GET',
    });
  },
  update: (data: Record<string, unknown>) => {
    return apiCall<{ preferences: Record<string, unknown>; message: string }>('/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  sendTest: (type: string) => {
    return apiCall<{ message: string }>('/notification-preferences/test', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  },
};

// Custom Fields API
export const customFieldsAPI = {
  getAll: (section?: string) => {
    const queryParams = section ? `?section=${section}` : '';
    return apiCall<{ customFields: CustomField[] }>(`/custom-fields${queryParams}`, {
      method: 'GET',
    });
  },
  getById: (id: string) => {
    return apiCall<unknown>(`/custom-fields/${id}`, {
      method: 'GET',
    });
  },
  create: (data: Record<string, unknown>) => {
    return apiCall<unknown>('/custom-fields', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: Record<string, unknown>) => {
    return apiCall<unknown>(`/custom-fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) => {
    return apiCall<{ message: string }>(`/custom-fields/${id}`, {
      method: 'DELETE',
    });
  },
};

// Shipment Settings API
export const shipmentSettingsAPI = {
  getSettings: () => {
    return apiCall<{ settings: Record<string, unknown> }>('/shipment-settings', {
      method: 'GET',
    });
  },
  updateSettings: (data: Record<string, unknown>) => {
    return apiCall<{ settings: Record<string, unknown>; message: string }>('/shipment-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  resetSettings: () => {
    return apiCall<{ settings: Record<string, unknown>; message: string }>('/shipment-settings/reset', {
      method: 'POST',
    });
  },
};

// Backups API
const backupsAPI = {
  getAll: async () => {
    return apiCall<{ backups: any[]; backupDir: string; maxBackups: number; stats: any }>('/backups', {
      method: 'GET',
    });
  },

  create: async () => {
    return apiCall<{ success: boolean; message: string; backup: any }>('/backups/create', {
      method: 'POST',
    });
  },

  createCustom: async (options: { includeDatabase: boolean; includeUploads: boolean; includeCode: boolean; backupName?: string }) => {
    return apiCall<{ success: boolean; message: string; backup: any }>('/backups/create', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  createFullSystem: async () => {
    return apiCall<{ success: boolean; message: string; backup: any }>('/backups/create-full-system', {
      method: 'POST',
    });
  },

  getSettings: async () => {
    return apiCall<{ settings: Record<string, unknown> }>('/backups/settings', {
      method: 'GET',
    });
  },

  updateSettings: async (settings: any) => {
    return apiCall<{ success: boolean; message: string }>('/backups/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  testGitConnection: async (gitConfig: { gitRepoUrl?: string; gitToken?: string; gitBranch?: string }) => {
    return apiCall<{ success: boolean; message: string }>('/backups/settings/test-git', {
      method: 'POST',
      body: JSON.stringify(gitConfig),
    });
  },

  verifyPassword: async (password: string) => {
    return apiCall<{ success: boolean; message: string }>('/backups/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  delete: async (filename: string) => {
    return apiCall<{ success: boolean; message: string }>(`/backups/${filename}`, {
      method: 'DELETE',
    });
  },

  download: async (filename: string) => {
    // Note: Download is handled via fetch in component for blob handling
    return `/api/backups/download/${filename}`;
  },
};

// Email API
export const emailAPI = {
  getSettings: async () => {
    return apiCall<unknown>('/email/settings', { method: 'GET' });
  },
  updateSettings: async (data: Record<string, unknown>) => {
    return apiCall<unknown>('/email/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  testConnection: async (testEmail: string) => {
    return apiCall<unknown>('/email/test', {
      method: 'POST',
      body: JSON.stringify({ testEmail }),
    });
  },
  getNotifications: async () => {
    return apiCall<unknown>('/email/notifications', { method: 'GET' });
  },
  updateNotification: async (type: string, data: Record<string, unknown>) => {
    return apiCall<unknown>(`/email/notifications/${type}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  getStats: async () => {
    return apiCall<unknown>('/email/stats', { method: 'GET' });
  },
  sendCustom: async (data: { to: string | string[]; subject: string; message: string }) => {
    return apiCall<unknown>('/email/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Generic API methods (for components that use api.get, api.put, api.post pattern)
const genericApi = {
  get: async <T = any>(endpoint: string): Promise<{ data: T }> => {
    const data = await apiCall<T>(endpoint, { method: 'GET' });
    return { data };
  },
  put: async <T = any>(endpoint: string, body?: any): Promise<{ data: T }> => {
    const data = await apiCall<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  post: async <T = any>(endpoint: string, body?: any): Promise<{ data: T }> => {
    const data = await apiCall<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
  delete: async <T = any>(endpoint: string): Promise<{ data: T }> => {
    const data = await apiCall<T>(endpoint, { method: 'DELETE' });
    return { data };
  },
};


// Materials API
export const materialsAPI = {
  getAll: async (params?: { search?: string }) => {
    const query = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    return apiCall<unknown[]>(`/materials${query}`);
  },
  getById: async (id: string) => apiCall<unknown>(`/materials/${id}`),
  getHistory: async (materialId: string) => apiCall<unknown[]>(`/materials/${materialId}/history`),
  getJobMaterials: async (jobId: string) => apiCall<unknown[]>(`/materials/job-materials/${jobId}`),
  getPurchaseOrders: async () => apiCall<unknown[]>('/materials/purchase-orders'),
  getAvailableRacks: async () => apiCall<unknown[]>('/materials/available-racks'),
  createIssue: async (data: Record<string, unknown>) => apiCall<unknown>('/materials/issues', { method: 'POST', body: JSON.stringify(data) }),
  updateIssue: async (id: string, data: Record<string, unknown>) => apiCall<unknown>(`/materials/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createReturn: async (data: Record<string, unknown>) => apiCall<unknown>('/materials/returns', { method: 'POST', body: JSON.stringify(data) }),
  updateReturn: async (id: string, data: Record<string, unknown>) => apiCall<unknown>(`/materials/returns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReturn: async (id: string) => apiCall<{ message: string }>(`/materials/returns/${id}`, { method: 'DELETE' }),
  getApprovals: async () => apiCall<unknown[]>('/materials/approvals'),
  createApproval: async (data: Record<string, unknown>) => apiCall<unknown>('/materials/approvals', { method: 'POST', body: JSON.stringify(data) }),
  updateApproval: async (id: string, data: Record<string, unknown>) => apiCall<unknown>(`/materials/approvals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteApproval: async (id: string) => apiCall<{ message: string }>(`/materials/approvals/${id}`, { method: 'DELETE' }),
};
export default {
  ...genericApi,
  auth: authAPI,
  dashboard: dashboardAPI,
  shipments: shipmentsAPI,
  racks: racksAPI,
  categories: categoriesAPI,
  companies: companiesAPI,
  jobs: jobsAPI,
  billing: billingAPI,
  withdrawals: withdrawalsAPI,
  expenses: expensesAPI,
  company: companyAPI,
  users: usersAPI,
  invoiceSettings: invoiceSettingsAPI,
  notificationPreferences: notificationPreferencesAPI,
  customFields: customFieldsAPI,
  shipmentSettings: shipmentSettingsAPI,
  backups: backupsAPI,
  email: emailAPI,
  materials: materialsAPI,
};

// API configuration
const API_BASE_URL = '/api';

// Helper to get auth token
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper to set auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

// Helper to clear auth token
export const clearAuthToken = (): void => {
  localStorage.removeItem('authToken');
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
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
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
    const response = await apiCall<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    return response;
  },

  register: async (data: { email: string; password: string; name: string; companyId: string }) => {
    const response = await apiCall<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    return response;
  },

  me: async () => {
    return apiCall<{ user: any }>('/auth/me');
  },

  logout: () => {
    clearAuthToken();
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    return apiCall<any>('/dashboard/stats');
  },
};

// Shipments API
export const shipmentsAPI = {
  getAll: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiCall<any>(`/shipments${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiCall<{ shipment: any }>(`/shipments/${id}`);
  },

  create: async (data: any) => {
    return apiCall<{ shipment: any }>('/shipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiCall<{ shipment: any }>(`/shipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiCall<{ message: string }>(`/shipments/${id}`, {
      method: 'DELETE',
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
    return apiCall<{ racks: any[] }>(`/racks${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiCall<{ rack: any }>(`/racks/${id}`);
  },

  getCategories: async () => {
    return apiCall<{ categories: any[] }>('/racks/categories/list');
  },

  create: async (data: any) => {
    return apiCall<{ rack: any }>('/racks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiCall<{ rack: any }>(`/racks/${id}`, {
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
    const response = await apiCall<{ categories: any[] }>(`/categories/${companyId}`);
    return response.categories;
  },

  getDetail: async (categoryId: string) => {
    const response = await apiCall<{ category: any }>(`/categories/detail/${categoryId}`);
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
    return apiCall<any[]>(`/company-profiles/`);
  },

  getProfile: async (profileId: string) => {
    return apiCall<any>(`/company-profiles/${profileId}`);
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
    const jobs = await apiCall<any[]>(`/moving-jobs${query ? `?${query}` : ''}`);
    return { jobs }; // Wrap in object for compatibility
  },

  getById: async (id: string) => {
    return apiCall<{ job: any }>(`/moving-jobs/${id}`);
  },

  create: async (data: any) => {
    return apiCall<{ job: any }>('/moving-jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiCall<{ job: any }>(`/moving-jobs/${id}`, {
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
    return apiCall<any>('/billing/settings');
  },

  updateSettings: async (settings: any) => {
    return apiCall<any>('/billing/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Charge Types
  getChargeTypes: async (params?: { category?: string; active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.active !== undefined) query.append('active', String(params.active));
    
    return apiCall<any[]>(`/billing/charge-types${query.toString() ? '?' + query.toString() : ''}`);
  },

  getChargeType: async (id: string) => {
    return apiCall<any>(`/billing/charge-types/${id}`);
  },

  createChargeType: async (chargeType: any) => {
    return apiCall<any>('/billing/charge-types', {
      method: 'POST',
      body: JSON.stringify(chargeType),
    });
  },

  updateChargeType: async (id: string, chargeType: any) => {
    return apiCall<any>(`/billing/charge-types/${id}`, {
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
    return apiCall<any[]>(`/billing/invoices${query ? '?' + query : ''}`);
  },

  getInvoice: async (id: string) => {
    return apiCall<any>(`/billing/invoices/${id}`);
  },

  createInvoice: async (invoice: any) => {
    return apiCall<any>('/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  },

  recordPayment: async (invoiceId: string, payment: any) => {
    return apiCall<any>(`/billing/invoices/${invoiceId}/payments`, {
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
    return apiCall<any>(`/withdrawals${query ? `?${query}` : ''}`);
  },

  getById: async (id: string) => {
    return apiCall<{ withdrawal: any }>(`/withdrawals/${id}`);
  },

  create: async (data: any) => {
    return apiCall<{ withdrawal: any; message: string }>('/withdrawals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (id: string, status: string) => {
    return apiCall<{ withdrawal: any }>(`/withdrawals/${id}/status`, {
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
    return apiCall<{ expenses: any[]; summary: any }>(`/expenses?${params}`, {
      method: 'GET',
    });
  },

  getById: async (id: string) => {
    return apiCall<{ expense: any }>(`/expenses/${id}`, {
      method: 'GET',
    });
  },

  create: async (data: any) => {
    return apiCall<{ expense: any }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiCall<{ expense: any }>(`/expenses/${id}`, {
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
    return apiCall<{ expense: any }>(`/expenses/${id}/status`, {
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
    return apiCall<{ company: any }>('/company', {
      method: 'GET',
    });
  },
  updateInfo: (data: any) => {
    return apiCall<{ company: any; message: string }>('/company', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Users API
export const usersAPI = {
  getAll: () => {
    return apiCall<{ users: any[] }>('/users', {
      method: 'GET',
    });
  },
  getById: (id: string) => {
    return apiCall<{ user: any }>(`/users/${id}`, {
      method: 'GET',
    });
  },
  create: (data: any) => {
    return apiCall<{ user: any; message: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: any) => {
    return apiCall<{ user: any; message: string }>(`/users/${id}`, {
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
    return apiCall<{ user: any; message: string }>(`/users/${id}/toggle`, {
      method: 'PATCH',
    });
  },
};

// Invoice Settings API
export const invoiceSettingsAPI = {
  get: () => {
    return apiCall<{ settings: any }>('/invoice-settings', {
      method: 'GET',
    });
  },
  update: (data: any) => {
    return apiCall<{ settings: any; message: string }>('/invoice-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Notification Preferences API
export const notificationPreferencesAPI = {
  get: () => {
    return apiCall<{ preferences: any }>('/notification-preferences', {
      method: 'GET',
    });
  },
  update: (data: any) => {
    return apiCall<{ preferences: any; message: string }>('/notification-preferences', {
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
    return apiCall<{ customFields: any[] }>(`/custom-fields${queryParams}`, {
      method: 'GET',
    });
  },
  getById: (id: string) => {
    return apiCall<any>(`/custom-fields/${id}`, {
      method: 'GET',
    });
  },
  create: (data: any) => {
    return apiCall<any>('/custom-fields', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: any) => {
    return apiCall<any>(`/custom-fields/${id}`, {
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
    return apiCall<{ settings: any }>('/shipment-settings', {
      method: 'GET',
    });
  },
  updateSettings: (data: any) => {
    return apiCall<{ settings: any; message: string }>('/shipment-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  resetSettings: () => {
    return apiCall<{ settings: any; message: string }>('/shipment-settings/reset', {
      method: 'POST',
    });
  },
};

export default {
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
};

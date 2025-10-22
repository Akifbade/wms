import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiError {
  message: string;
  status?: number;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');

    // Add request interceptor
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          window.location.href = '/login';
        }
        throw error;
      }
    );
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  getToken(): string | null {
    return this.token;
  }

  // Auth endpoints
  async register(data: {
    uid: string;
    email: string;
    displayName: string;
    password: string;
    role?: string;
  }): Promise<any> {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string): Promise<any> {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async verifyToken(): Promise<any> {
    const response = await this.client.post('/auth/verify', {});
    return response.data;
  }

  // Jobs endpoints
  async getJobs(params?: { status?: string; skip?: number; take?: number }): Promise<any> {
    const response = await this.client.get('/jobs', { params });
    return response.data;
  }

  async getJobById(id: string): Promise<any> {
    const response = await this.client.get(`/jobs/${id}`);
    return response.data;
  }

  async createJob(data: any): Promise<any> {
    const response = await this.client.post('/jobs', data);
    return response.data;
  }

  async updateJob(id: string, data: any): Promise<any> {
    const response = await this.client.put(`/jobs/${id}`, data);
    return response.data;
  }

  async checkJob(id: string): Promise<any> {
    const response = await this.client.post(`/jobs/${id}/check`, {});
    return response.data;
  }

  async approveJob(id: string): Promise<any> {
    const response = await this.client.post(`/jobs/${id}/approve`, {});
    return response.data;
  }

  async rejectJob(id: string, reason: string): Promise<any> {
    const response = await this.client.post(`/jobs/${id}/reject`, { reason });
    return response.data;
  }

  async deleteJob(id: string): Promise<any> {
    const response = await this.client.delete(`/jobs/${id}`);
    return response.data;
  }

  // Users endpoints
  async getUsers(): Promise<any> {
    const response = await this.client.get('/users');
    return response.data;
  }

  async getUserById(id: string): Promise<any> {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async createUser(data: any): Promise<any> {
    const response = await this.client.post('/users', data);
    return response.data;
  }

  async updateUser(id: string, data: any): Promise<any> {
    const response = await this.client.put(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string): Promise<any> {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  // Clients endpoints
  async getClients(): Promise<any> {
    const response = await this.client.get('/clients');
    return response.data;
  }

  async getClientById(id: string): Promise<any> {
    const response = await this.client.get(`/clients/${id}`);
    return response.data;
  }

  async createClient(data: any): Promise<any> {
    const response = await this.client.post('/clients', data);
    return response.data;
  }

  async updateClient(id: string, data: any): Promise<any> {
    const response = await this.client.put(`/clients/${id}`, data);
    return response.data;
  }

  async deleteClient(id: string): Promise<any> {
    const response = await this.client.delete(`/clients/${id}`);
    return response.data;
  }

  // Feedback endpoints
  async getFeedback(jobId: string): Promise<any> {
    const response = await this.client.get(`/feedback/job/${jobId}`);
    return response.data;
  }

  async createFeedback(data: any): Promise<any> {
    const response = await this.client.post('/feedback', data);
    return response.data;
  }

  async updateFeedback(id: string, data: any): Promise<any> {
    const response = await this.client.put(`/feedback/${id}`, data);
    return response.data;
  }

  // Settings endpoints
  async getSettings(): Promise<any> {
    const response = await this.client.get('/settings');
    return response.data;
  }

  async getSetting(key: string): Promise<any> {
    const response = await this.client.get(`/settings/${key}`);
    return response.data;
  }

  async updateSetting(key: string, value: any): Promise<any> {
    const response = await this.client.put(`/settings/${key}`, { value });
    return response.data;
  }

  // Stats endpoints
  async getDashboardStats(): Promise<any> {
    const response = await this.client.get('/stats/dashboard/summary');
    return response.data;
  }

  async getJobsByStatus(): Promise<any> {
    const response = await this.client.get('/stats/jobs/by-status');
    return response.data;
  }

  async getRecentActivity(): Promise<any> {
    const response = await this.client.get('/stats/activity/recent');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Error handler
  handleError(error: AxiosError): ApiError {
    const status = error.response?.status || 500;
    const message =
      (error.response?.data as any)?.error ||
      error.message ||
      'An error occurred';

    return { message, status };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export default
export default apiClient;

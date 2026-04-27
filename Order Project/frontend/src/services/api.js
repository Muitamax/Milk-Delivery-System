import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1',
  timeout: 30000, // 30 seconds for slow mobile networks
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        const { token } = response.data.data;
        localStorage.setItem('token', token);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }

    return Promise.reject(error);
  }
);

// API service functions
export const authAPI = {
  login: (phone, password) => api.post('/auth/login', { phone, password }),
  refreshToken: () => api.post('/auth/refresh'),
};

export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  search: (query) => api.get('/customers/search', { params: { q: query } }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const deliveryAPI = {
  getAll: (params) => api.get('/deliveries', { params }),
  getById: (id) => api.get(`/deliveries/${id}`),
  create: (data) => api.post('/deliveries', data),
  getReceipt: (id) => api.get(`/deliveries/${id}/receipt`),
};

export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getUnmatched: () => api.get('/payments/unmatched'),
  matchPayment: (id, customerId) => api.post(`/payments/${id}/match`, { customer_id: customerId }),
};

export const transactionAPI = {
  getCustomerTransactions: (customerId, params) => 
    api.get(`/transactions/customer/${customerId}`, { params }),
  getCustomerSummary: (customerId, params) => 
    api.get(`/transactions/summary/${customerId}`, { params }),
  getAll: (params) => api.get('/transactions', { params }),
};

export const dashboardAPI = {
  getMetrics: () => api.get('/dashboard/metrics'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
  getTopCustomers: (params) => api.get('/dashboard/top-customers', { params }),
  getDeliveryTrends: (params) => api.get('/dashboard/delivery-trends', { params }),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const smsAPI = {
  send: (data) => api.post('/sms/send', data),
  getLogs: (params) => api.get('/sms/logs', { params }),
  getStats: (params) => api.get('/sms/stats', { params }),
};

export const adjustmentAPI = {
  getAll: (params) => api.get('/adjustments', { params }),
  getById: (id) => api.get(`/adjustments/${id}`),
  create: (data) => api.post('/adjustments', data),
};

export default api;

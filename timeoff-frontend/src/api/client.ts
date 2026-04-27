import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthHeaders(userId: string, role: 'EMPLOYEE' | 'MANAGER') {
  if (role === 'MANAGER') {
    delete apiClient.defaults.headers.common['x-employee-id'];
    apiClient.defaults.headers.common['x-manager-id'] = userId;
  } else {
    delete apiClient.defaults.headers.common['x-manager-id'];
    apiClient.defaults.headers.common['x-employee-id'] = userId;
  }
}

export function clearAuthHeaders() {
  delete apiClient.defaults.headers.common['x-employee-id'];
  delete apiClient.defaults.headers.common['x-manager-id'];
}

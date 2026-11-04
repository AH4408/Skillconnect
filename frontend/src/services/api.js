import axios from 'axios';

export const dataOf = value => value?.data ?? value;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5004/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('skillconnect_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  res => res.data,
  async err => {
    const original = err.config;
    const status = err.response?.status;
    const isRefreshRequest = original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register');

    if (status === 401 && original && !original._retry && !isRefreshRequest) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
            .then(res => res.data?.data ?? res.data)
            .finally(() => { refreshPromise = null; });
        }

        const refreshed = await refreshPromise;
        const token = refreshed?.accessToken;
        if (token) {
          localStorage.setItem('skillconnect_access_token', token);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }
      } catch (refreshError) {
        localStorage.removeItem('skillconnect_access_token');
        localStorage.removeItem('skillconnect_user');
      }
    }

    const message = err.response?.data?.message || err.message || 'API request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;

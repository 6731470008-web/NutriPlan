import axios, { InternalAxiosRequestConfig } from 'axios';

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Use relative path '/api/v1' so Next.js rewrite proxy routes all requests directly to backend,
  // working seamlessly over ngrok, LAN, and public domains without CORS issues or double tunnels.
  return '/api/v1';
};

export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to dynamically set baseURL and append JWT bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getApiBaseUrl();
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('nutriplan_jwt_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

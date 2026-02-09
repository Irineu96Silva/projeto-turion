import axios from 'axios';

// Get API URL from environment or use default
// In development (Vite): use relative path (proxied by vite.config.ts)
// In production (Cloudflare Pages): use full VPS URL
const isProduction = import.meta.env.PROD;
const apiBaseUrl = isProduction 
  ? import.meta.env.VITE_API_URL || 'http://54.232.134.140:3000/api'
  : '/api';

console.log(`[Turion] API Base URL: ${apiBaseUrl} (Production: ${isProduction})`);

export const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('turion_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

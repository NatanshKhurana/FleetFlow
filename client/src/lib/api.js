import axios from 'axios';

// Vite exposes VITE_* values in the browser bundle. This URL must be public.
const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:5000/api';

// Configure the shared client now; future steps will add API calls.
const api = axios.create({ baseURL, timeout: 10000 });

export default api;

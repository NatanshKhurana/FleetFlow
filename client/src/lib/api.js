import axios from 'axios';

// Vite exposes VITE_* values in the browser bundle. This URL must be public.
const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';

// Relative local requests use Vite's proxy; production needs the same-origin API or an override.
const api = axios.create({ baseURL, timeout: 10000 });

export default api;

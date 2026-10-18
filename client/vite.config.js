import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Read only the public proxy setting from client configuration, never server/.env.
  const env = loadEnv(mode, process.cwd(), 'API_PROXY_TARGET');
  const proxy = {
    '/api': { target: env.API_PROXY_TARGET?.trim() || 'http://localhost:5000', changeOrigin: true },
  };
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  };
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Dev loop: `npm run dev` on :5173 proxies /api to the Spring Boot backend (Docker: :8081; set VITE_API_PROXY=http://localhost:8080 for ./mvnw spring-boot:run).
// In Docker, nginx serves the build and proxies /api instead (see nginx.conf).
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY ?? 'http://localhost:8081',
          changeOrigin: true,
        },
      },
      // HMR can be disabled via DISABLE_HMR=true (e.g. in constrained environments)
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

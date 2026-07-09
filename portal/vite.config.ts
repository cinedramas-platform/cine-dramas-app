import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Served at cinedramas.com/admin — all assets and routes live under /admin/.
export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
});

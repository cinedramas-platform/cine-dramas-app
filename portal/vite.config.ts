import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Standalone web CRM — served from its own URL at the root path.
// To host under a sub-path instead (e.g. example.com/admin), build with
// PORTAL_BASE=/admin/.
export default defineConfig({
  base: process.env.PORTAL_BASE ?? '/',
  plugins: [react(), tailwindcss()],
});

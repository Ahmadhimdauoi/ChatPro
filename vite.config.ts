import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Set root to current directory
  build: {
    outDir: 'dist',
  },
  server: {
    port: 8000, // Frontend will run on port 8000
  },
  envPrefix: 'VITE_', // Ensure VITE_API_KEY is picked up
});
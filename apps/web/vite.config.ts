import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Explicitly set root to this directory (apps/web)
  // This allows building from the monorepo root
  root: __dirname,
  
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@repo/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
  
  build: {
    // Output to dist directory in apps/web
    outDir: 'dist',
    // Generate source maps for production debugging
    sourcemap: true,
  },
  
  server: {
    port: 5000,
    host: '0.0.0.0',
  },
});

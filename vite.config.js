import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('chart.js')) return 'chart';
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf';
        },
      },
    },
  },
});

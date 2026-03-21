import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          pdf: ['jspdf', 'jspdf-autotable'],
          maps: ['d3-geo', 'd3-selection', 'topojson-client'],
          animation: ['gsap'],
        }
      }
    }
  }
})

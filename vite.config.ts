import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import generouted from '@generouted/tanstack-react-router'
import path from 'path'

export default defineConfig({ 
  plugins: [react(), generouted()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, './convex'),
    },
  },
})

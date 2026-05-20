import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vercelApiPlugin } from './vite-plugin-api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiPlugin()],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_ID__:   JSON.stringify(Date.now().toString(36)),
  },
})

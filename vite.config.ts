import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // only the icons in src/frontend/icons.ts get bundled (the package's own entry ships all of them)
    alias: [{ find: /^@phosphor-icons\/react$/, replacement: fileURLToPath(new URL('./src/frontend/icons.ts', import.meta.url)) }],
  },
  build: {
    rolldownOptions: {
      output: {
        // libraries in their own files: they rarely change, so returning players keep them cached across updates
        manualChunks(id: string) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//.test(id)) return 'motion'
          if (/node_modules\/@supabase\//.test(id)) return 'supabase'
        },
      },
    },
  },
})

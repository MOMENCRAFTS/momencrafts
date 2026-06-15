import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Serve static sub-sites (admin, etc.) before SPA catch-all
function staticSubSites() {
  return {
    name: 'static-sub-sites',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0] || ''
        // /admin or /admin/ → serve public/admin/index.html
        if (url === '/admin' || url === '/admin/') {
          const file = resolve(__dirname, 'public/admin/index.html')
          if (fs.existsSync(file)) {
            res.setHeader('Content-Type', 'text/html')
            res.end(fs.readFileSync(file, 'utf-8'))
            return
          }
        }
        // /tdc or /tdc/ → serve public/tdc/index.html
        if (url === '/tdc' || url === '/tdc/') {
          const file = resolve(__dirname, 'public/tdc/index.html')
          if (fs.existsSync(file)) {
            res.setHeader('Content-Type', 'text/html')
            res.end(fs.readFileSync(file, 'utf-8'))
            return
          }
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [staticSubSites(), react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          zustand: ['zustand']
        }
      }
    }
  }
})

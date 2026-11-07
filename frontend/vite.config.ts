import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// 這些環境變數不加 VITE_ 前綴，所以不會被打包進前端程式
const proxyTarget = process.env.DEV_PROXY_TARGET ?? 'http://app:8000'
const hmrClientPort = process.env.DEV_HMR_CLIENT_PORT

export default defineConfig({
  // router plugin 必須在 react() 之前
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': proxyTarget,
      '/mcp': proxyTarget,
    },
    watch: { usePolling: process.env.DEV_USE_POLLING === '1' },
    // 主機發布的 port 和容器內 5173 不同時，瀏覽器才連得到 HMR
    hmr: hmrClientPort ? { clientPort: Number(hmrClientPort) } : undefined,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
})

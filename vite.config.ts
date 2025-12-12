import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 設定 base 為 './' 確保在 GitHub Pages 非根目錄下也能正確讀取資源
  base: './', 
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 링크/파일 하나로 공유하는 "단일 HTML 데모" 빌드 설정 (Figma Make 용 vite.config.ts 와 분리)
// 이미지(src/assets/skills)도 data URL 로 HTML 안에 포함된다.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-single',
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
})

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Figma Make 가 생성한 vite.config.ts 는 건드리지 않고 테스트 전용 설정을 분리
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 40_000,
  },
})

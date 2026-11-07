// 讓所有前端測試都能使用 Testing Library 的 jest-dom matcher（例如 toBeVisible）。
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 每個測試結束後卸載畫面，避免上一個測試的 DOM 留到下一個測試。
// 沒有開啟 vitest 的 globals 時，Testing Library 不會自動做這件事。
afterEach(() => {
  cleanup()
})

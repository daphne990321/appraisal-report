import { render, screen } from '@testing-library/react'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { routeTree } from '@/routeTree.gen'

describe('home page', () => {
  it('shows the placeholder title after rendering', async () => {
    // 從 `/` 進入完整的 route tree，確認首頁被渲染出來。
    // 不直接取出 route 物件上的元件，所以不依賴 route 物件的形狀，也不受程式碼分割影響。
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })

    render(<RouterProvider router={router} />)

    // 首頁元件可能是延遲載入的，所以用 findBy 等它出現（有時間上限，不是固定等待）。
    expect(await screen.findByText('不動產估價報告系統')).toBeVisible()
  })
})

import { createFileRoute } from '@tanstack/react-router'

// 佔位首頁：不呼叫 API，沒有視覺設計
export const Route = createFileRoute('/')({
  component: () => (
    <main>
      <h1>不動產估價報告系統</h1>
      <p>新版建置中</p>
    </main>
  ),
})

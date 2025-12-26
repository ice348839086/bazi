import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 灵龙算命 - 智能八字命理分析系统',
  description: '基于传统八字命理学与人工智能技术，为您提供专业的命理分析和人生指导。',
  keywords: ['算命', '八字', '命理', '运势', 'AI', '人工智能'],
  authors: [{ name: 'AI Divination' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col mystical-bg">
        {/* 星星背景 */}
        <div className="stars-bg" />

        {/* 八卦装饰 */}
        <div className="bagua-decoration top-20 left-10" />
        <div className="bagua-decoration bottom-20 right-10" style={{ animationDirection: 'reverse' }} />

        {/* 主内容 */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}

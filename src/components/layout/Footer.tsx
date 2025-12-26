'use client'

export function Footer() {
  return (
    <footer className="py-6 px-4 mt-auto">
      <div className="max-w-6xl mx-auto text-center">
        {/* Decorative line */}
        <div className="w-64 h-px mx-auto bg-gradient-to-r from-transparent via-mystic-500/30 to-transparent mb-4" />

        <p className="text-mystic-500 text-sm">
          命理分析仅供参考，请理性看待
        </p>
        <p className="text-mystic-600 text-xs mt-2">
          © {new Date().getFullYear()} AI 灵龙算命 · Powered by DeepSeek
        </p>
      </div>
    </footer>
  )
}

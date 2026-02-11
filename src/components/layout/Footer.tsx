'use client'

export function Footer() {
  return (
    <footer className="py-6 px-4 mt-auto">
      <div className="max-w-6xl mx-auto text-center space-y-3">
        {/* Decorative line */}
        <div className="w-64 h-px mx-auto bg-gradient-to-r from-transparent via-mystic-500/30 to-transparent" />

        {/* 免责声明 */}
        <div className="max-w-2xl mx-auto">
          <p className="text-mystic-500 text-xs leading-relaxed">
            <span className="text-gold-500/70 font-medium">免责声明：</span>
            本平台提供的命理分析由 AI 生成，仅供娱乐和文化参考，不构成任何医疗、法律、投资或人生决策建议。
            请理性看待分析结果，切勿过度依赖。未成年人请在监护人指导下使用。
          </p>
        </div>

        {/* 隐私提示 */}
        <p className="text-mystic-600 text-xs">
          您的个人信息仅用于本次分析，不会被存储或分享给第三方
        </p>

        <p className="text-mystic-600 text-xs">
          © {new Date().getFullYear()} AI 灵龙算命 · Powered by DeepSeek
        </p>
      </div>
    </footer>
  )
}

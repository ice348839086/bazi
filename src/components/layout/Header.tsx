'use client'

import { Sparkles } from 'lucide-react'

export function Header() {
  return (
    <header className="relative py-6 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-center">
        <div className="flex items-center gap-3">
          {/* Logo Icon */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-mystic-600 to-mystic-900 flex items-center justify-center animate-pulse-glow">
              <Sparkles className="w-6 h-6 text-gold-400" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-gold-500/20 to-mystic-500/20 rounded-full blur-sm -z-10" />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gradient-gold tracking-wider">
              AI 灵龙算命
            </h1>
            <p className="text-xs md:text-sm text-mystic-400 tracking-widest mt-0.5">
              智能八字命理分析系统
            </p>
          </div>
        </div>
      </div>

      {/* Decorative line */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
    </header>
  )
}

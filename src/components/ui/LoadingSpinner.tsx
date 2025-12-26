'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* 八卦旋转动画 */}
      <div className={`${sizes[size]} relative animate-spin-slow`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* 外圈 */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="url(#goldGradient)"
            strokeWidth="2"
          />
          {/* 阴阳鱼 */}
          <path
            d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2"
            fill="rgba(251, 191, 36, 0.3)"
          />
          <circle cx="50" cy="26" r="6" fill="rgba(139, 92, 246, 0.8)" />
          <circle cx="50" cy="74" r="6" fill="rgba(251, 191, 36, 0.8)" />
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 加载文字 */}
      {text && (
        <p className="text-mystic-300 text-center animate-pulse">
          {text}
        </p>
      )}

      {/* 加载点 */}
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  )
}

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="mystic-card p-8 max-w-sm w-full mx-4">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  )
}

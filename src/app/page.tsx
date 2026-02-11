'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Header, Footer } from '@/components/layout'
import { UserInfoForm, BaZiDisplay, ChatInterface, ReportDisplay } from '@/components/divination'
import { LoadingOverlay } from '@/components/ui'
import { useDivinationStore } from '@/store/divination'
import { calculateMingPan } from '@/lib/bazi'
import type { UserInfo, AIQuestion } from '@/types'

interface QARecord {
  question: string
  answer: string
}

export default function Home() {
  const {
    phase,
    setPhase,
    mingPan,
    setMingPan,
    setUserInfo,
    report,
    setReport,
    isLoading,
    setLoading,
    error,
    setError,
    reset,
    restoreSession,
    analysisMessages,
    setAnalysisMessages,
    addAnalysisMessage,
    currentQuestions,
    setCurrentQuestions,
    qaHistory,
    setQaHistory,
    roundNumber,
    setRoundNumber,
    isComplete,
    setIsComplete,
  } = useDivinationStore()

  const abortControllerRef = useRef<AbortController | null>(null)
  const retryRef = useRef<(() => void) | null>(null)
  const [canRetry, setCanRetry] = useState(false)

  // Restore session on mount
  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  // Abort all requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const abortPreviousRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    return abortControllerRef.current
  }

  // 处理用户信息提交
  const handleUserInfoSubmit = useCallback(async (userInfo: UserInfo) => {
    try {
      setLoading(true)
      setError(null)
      retryRef.current = null
      setCanRetry(false)

      setUserInfo(userInfo)

      // 计算八字
      const calculatedMingPan = calculateMingPan(userInfo)
      setMingPan(calculatedMingPan)
      setPhase('analyzing')

      const controller = abortPreviousRequest()

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'initial',
          mingPan: calculatedMingPan,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorMsg = '分析请求失败'
        try {
          const errData = await response.json()
          if (errData.error) errorMsg = errData.error
        } catch { /* 无法解析 JSON */ }
        throw new Error(errorMsg)
      }

      const data = await response.json()

      if (data.analysis) {
        setAnalysisMessages([{
          id: `msg_${Date.now()}`,
          content: data.analysis,
          timestamp: Date.now(),
        }])
      }

      if (data.questions && data.questions.length > 0) {
        setCurrentQuestions(data.questions)
      }

      setPhase('inquiry')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : '发生未知错误'
      setError(msg)
      setPhase('input')
      retryRef.current = () => handleUserInfoSubmit(userInfo)
      setCanRetry(true)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setMingPan, setPhase, setUserInfo, setAnalysisMessages, setCurrentQuestions])

  // 处理用户回答选择题
  const handleAnswer = useCallback(async (answers: Record<string, string>) => {
    if (!mingPan) return

    try {
      setLoading(true)
      retryRef.current = null
      setCanRetry(false)

      const newQARecords: QARecord[] = Object.entries(answers).map(([key, answer]) => ({
        // key 格式为 "id::question"，提取 question 部分
        question: key.includes('::') ? key.split('::').slice(1).join('::') : key,
        answer,
      }))

      const updatedQaHistory = [...qaHistory, ...newQARecords]
      setQaHistory(updatedQaHistory)
      setCurrentQuestions([])

      const controller = abortPreviousRequest()

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'followup',
          mingPan,
          qaHistory: updatedQaHistory,
          roundNumber: roundNumber + 1,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorMsg = '请求失败'
        try {
          const errData = await response.json()
          if (errData.error) errorMsg = errData.error
        } catch { /* 无法解析 JSON */ }
        throw new Error(errorMsg)
      }

      const data = await response.json()

      if (data.analysis) {
        addAnalysisMessage({
          id: `msg_${Date.now()}`,
          content: data.analysis,
          timestamp: Date.now(),
        })
      }

      setRoundNumber(roundNumber + 1)

      if (data.isComplete) {
        setIsComplete(true)
        setCurrentQuestions([])
      } else if (data.questions && data.questions.length > 0) {
        setCurrentQuestions(data.questions)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : '处理回答失败')
      retryRef.current = () => handleAnswer(answers)
      setCanRetry(true)
    } finally {
      setLoading(false)
    }
  }, [mingPan, qaHistory, roundNumber, setLoading, setError, setQaHistory, setCurrentQuestions, addAnalysisMessage, setRoundNumber, setIsComplete])

  // 生成报告
  const handleGenerateReport = useCallback(async () => {
    if (!mingPan) return

    try {
      setLoading(true)
      setPhase('generating')
      retryRef.current = null
      setCanRetry(false)

      const controller = abortPreviousRequest()

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report',
          mingPan,
          qaHistory,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorMsg = '生成报告失败'
        try {
          const errData = await response.json()
          if (errData.error) errorMsg = errData.error
        } catch { /* 无法解析 JSON */ }
        throw new Error(errorMsg)
      }

      const data = await response.json()

      if (data.report) {
        setReport(data.report)
        setPhase('report')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : '生成报告失败')
      setPhase('inquiry')
      retryRef.current = () => handleGenerateReport()
      setCanRetry(true)
    } finally {
      setLoading(false)
    }
  }, [mingPan, qaHistory, setLoading, setPhase, setReport, setError])

  // 重新开始
  const handleRestart = useCallback(() => {
    reset()
    retryRef.current = null
    setCanRetry(false)
  }, [reset])

  const handleRetry = useCallback(() => {
    retryRef.current?.()
    setError(null)
    setCanRetry(false)
  }, [])

  // 渲染加载遮罩
  const renderLoading = () => {
    if (phase === 'analyzing') {
      return <LoadingOverlay text="正在排盘分析中..." />
    }
    if (phase === 'generating') {
      return <LoadingOverlay text="正在生成命理报告..." />
    }
    return null
  }

  // 渲染主内容
  const renderContent = () => {
    switch (phase) {
      case 'input':
        return (
          <UserInfoForm
            onSubmit={handleUserInfoSubmit}
            isLoading={isLoading}
          />
        )

      case 'analyzing':
        return mingPan ? <BaZiDisplay mingPan={mingPan} /> : null

      case 'inquiry':
        return (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {mingPan && <BaZiDisplay mingPan={mingPan} />}
            </div>

            <div className="lg:col-span-2">
              <div className="mystic-card h-full min-h-[500px]">
                <ChatInterface
                  analysisMessages={analysisMessages}
                  currentQuestions={currentQuestions}
                  onAnswer={handleAnswer}
                  isLoading={isLoading}
                  isComplete={isComplete}
                  onGenerateReport={handleGenerateReport}
                />
              </div>
            </div>
          </div>
        )

      case 'generating':
        return mingPan ? <BaZiDisplay mingPan={mingPan} /> : null

      case 'report':
        return report ? (
          <ReportDisplay report={report} qaHistory={qaHistory} onRestart={handleRestart} />
        ) : null

      default:
        return null
    }
  }

  return (
    <>
      <Header />

      <main className="flex-1 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 进度指示器 */}
          {phase !== 'input' && (
            <div className="mb-8">
              <div className="progress-steps">
                {[
                  { key: 'input', label: '填写信息', icon: '1' },
                  { key: 'analyzing', label: '排盘分析', icon: '2' },
                  { key: 'inquiry', label: '互动问答', icon: '3' },
                  { key: 'generating', label: '生成报告', icon: '4' },
                  { key: 'report', label: '查看报告', icon: '5' },
                ].map((step, index, arr) => {
                  const phases: string[] = ['input', 'analyzing', 'inquiry', 'generating', 'report']
                  const currentIndex = phases.indexOf(phase)
                  const stepIndex = phases.indexOf(step.key)
                  const status = stepIndex < currentIndex ? 'completed' : stepIndex === currentIndex ? 'active' : 'pending'

                  return (
                    <div key={step.key} className="progress-step">
                      <div className="flex flex-col items-center">
                        <div className={`progress-step-dot ${status}`}>
                          {status === 'completed' ? '✓' : step.icon}
                        </div>
                        <span className={`progress-step-label ${status === 'active' ? 'text-gold-400' : status === 'completed' ? 'text-green-400' : 'text-mystic-500'}`}>
                          {step.label}
                        </span>
                      </div>
                      {index < arr.length - 1 && (
                        <div className={`progress-step-line ${stepIndex < currentIndex ? 'completed' : 'pending'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300">
              <p className="font-medium">出错了</p>
              <p className="text-sm mt-1">{error}</p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setError(null)}
                  className="text-sm px-3 py-1.5 rounded-lg text-mystic-400 hover:text-mystic-300 hover:bg-mystic-800/50 transition-colors"
                >
                  关闭
                </button>
                {canRetry && (
                  <button
                    onClick={handleRetry}
                    className="text-sm px-4 py-1.5 rounded-lg bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-500/30 transition-colors font-medium"
                  >
                    重试
                  </button>
                )}
                {phase !== 'input' && (
                  <button
                    onClick={handleRestart}
                    className="text-sm px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                  >
                    重新开始
                  </button>
                )}
              </div>
            </div>
          )}

          {renderContent()}
        </div>
      </main>

      <Footer />

      {renderLoading()}
    </>
  )
}

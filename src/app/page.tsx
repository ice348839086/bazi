'use client'

import { useState, useCallback } from 'react'
import { Header, Footer } from '@/components/layout'
import { UserInfoForm, BaZiDisplay, ChatInterface, ReportDisplay } from '@/components/divination'
import { LoadingOverlay } from '@/components/ui'
import { useDivinationStore } from '@/store/divination'
import { calculateMingPan } from '@/lib/bazi'
import type { UserInfo, AIQuestion } from '@/types'

interface AnalysisMessage {
  id: string
  content: string
  timestamp: number
}

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
    report,
    setReport,
    isLoading,
    setLoading,
    error,
    setError,
    reset,
  } = useDivinationStore()

  // 本地状态
  const [analysisMessages, setAnalysisMessages] = useState<AnalysisMessage[]>([])
  const [currentQuestions, setCurrentQuestions] = useState<AIQuestion[]>([])
  const [qaHistory, setQaHistory] = useState<QARecord[]>([])
  const [roundNumber, setRoundNumber] = useState(1)
  const [isComplete, setIsComplete] = useState(false)

  // 处理用户信息提交
  const handleUserInfoSubmit = useCallback(async (userInfo: UserInfo) => {
    try {
      setLoading(true)
      setError(null)

      // 计算八字
      const calculatedMingPan = calculateMingPan(userInfo)
      setMingPan(calculatedMingPan)
      setPhase('analyzing')

      // 调用 API 进行初步分析
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'initial',
          mingPan: calculatedMingPan,
        }),
      })

      if (!response.ok) {
        throw new Error('分析请求失败')
      }

      const data = await response.json()

      // 添加分析消息
      if (data.analysis) {
        setAnalysisMessages([{
          id: `msg_${Date.now()}`,
          content: data.analysis,
          timestamp: Date.now(),
        }])
      }

      // 设置问题
      if (data.questions && data.questions.length > 0) {
        setCurrentQuestions(data.questions)
      }

      setPhase('inquiry')
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误')
      setPhase('input')
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setMingPan, setPhase])

  // 处理用户回答选择题
  const handleAnswer = useCallback(async (answers: Record<string, string>) => {
    if (!mingPan) return

    try {
      setLoading(true)

      // 将新答案添加到历史记录
      const newQARecords: QARecord[] = Object.entries(answers).map(([question, answer]) => ({
        question,
        answer,
      }))

      const updatedQaHistory = [...qaHistory, ...newQARecords]
      setQaHistory(updatedQaHistory)

      // 清空当前问题
      setCurrentQuestions([])

      // 调用 API 继续对话
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'followup',
          mingPan,
          qaHistory: updatedQaHistory,
          roundNumber: roundNumber + 1,
        }),
      })

      if (!response.ok) {
        throw new Error('请求失败')
      }

      const data = await response.json()

      // 添加新的分析消息
      if (data.analysis) {
        setAnalysisMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            content: data.analysis,
            timestamp: Date.now(),
          },
        ])
      }

      // 更新轮次
      setRoundNumber((prev) => prev + 1)

      // 检查是否完成
      if (data.isComplete) {
        setIsComplete(true)
        setCurrentQuestions([])
      } else if (data.questions && data.questions.length > 0) {
        setCurrentQuestions(data.questions)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理回答失败')
    } finally {
      setLoading(false)
    }
  }, [mingPan, qaHistory, roundNumber, setLoading, setError])

  // 生成报告
  const handleGenerateReport = useCallback(async () => {
    if (!mingPan) return

    try {
      setLoading(true)
      setPhase('generating')

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report',
          mingPan,
          qaHistory,
        }),
      })

      if (!response.ok) {
        throw new Error('生成报告失败')
      }

      const data = await response.json()

      if (data.report) {
        setReport(data.report)
        setPhase('report')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报告失败')
      setPhase('inquiry')
    } finally {
      setLoading(false)
    }
  }, [mingPan, qaHistory, setLoading, setPhase, setReport, setError])

  // 重新开始
  const handleRestart = useCallback(() => {
    reset()
    setAnalysisMessages([])
    setCurrentQuestions([])
    setQaHistory([])
    setRoundNumber(1)
    setIsComplete(false)
  }, [reset])

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
            {/* 八字展示 - 左侧 */}
            <div className="lg:col-span-1">
              {mingPan && <BaZiDisplay mingPan={mingPan} />}
            </div>

            {/* 选择题界面 - 右侧 */}
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
          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300">
              <p className="font-medium">出错了</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-400 hover:text-red-300 mt-2"
              >
                关闭
              </button>
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

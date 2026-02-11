'use client'

import { useState, useRef, useEffect } from 'react'
import { Briefcase, GraduationCap, Home, Coins, Heart, Calendar, Lightbulb, Download, RotateCcw, Send, MessageCircle, Loader2 } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import type { FortuneReport } from '@/types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface QARecord {
  question: string
  answer: string
}

interface ReportDisplayProps {
  report: FortuneReport
  qaHistory?: QARecord[]
  onRestart?: () => void
}

interface AnalysisSectionProps {
  icon: React.ReactNode
  title: string
  content: string
  color: string
}

function AnalysisSection({ icon, title, content, color }: AnalysisSectionProps) {
  return (
    <div className="animate-fadeIn">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <h3 className="text-lg font-semibold" style={{ color }}>
          {title}
        </h3>
      </div>
      <div className="pl-[52px] text-mystic-300 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}

export function ReportDisplay({ report, qaHistory = [], onRestart }: ReportDisplayProps) {
  const { summary, analysis, keyYears, advice, generatedAt, mingPan } = report

  // 对话状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // 自动滚动到最新消息
  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')

    msgIdCounter.current++
    const userChatMsg: ChatMessage = { id: `user_${msgIdCounter.current}`, role: 'user', content: userMessage }

    // 先构建包含当前用户消息的完整历史（避免 setState 异步导致传参缺失）
    const updatedHistory = [...chatMessages, userChatMsg]

    // 添加用户消息到 UI
    setChatMessages(updatedHistory)
    setIsLoading(true)
    setLastFailedQuestion(null)

    // 取消上一个未完成的请求
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          mingPan,
          qaHistory,
          reportSummary: summary,
          chatHistory: updatedHistory,
          userQuestion: userMessage,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        // 尝试读取 API 返回的错误信息
        let errorMsg = '请求失败'
        try {
          const errData = await response.json()
          if (errData.error) errorMsg = errData.error
        } catch {
          // 无法解析 JSON，使用默认消息
        }
        throw new Error(errorMsg)
      }

      const data = await response.json()

      // 添加AI回复
      msgIdCounter.current++
      setChatMessages(prev => [...prev, { id: `ai_${msgIdCounter.current}`, role: 'assistant', content: data.reply }])
    } catch (error) {
      // 忽略 abort 错误
      if (error instanceof Error && error.name === 'AbortError') return
      const failMsg = error instanceof Error ? error.message : '抱歉，回答时遇到了问题，请稍后重试。'
      msgIdCounter.current++
      setChatMessages(prev => [...prev, {
        id: `err_${msgIdCounter.current}`,
        role: 'assistant',
        content: `⚠️ ${failMsg}`,
      }])
      setLastFailedQuestion(userMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 重试失败的聊天消息
  const handleRetryChat = () => {
    if (!lastFailedQuestion) return
    // 一次性移除末尾的错误消息和对应的用户消息
    setChatMessages(prev => {
      let msgs = [...prev]
      // 移除最后一条错误消息
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant' && last.content.startsWith('⚠️')) {
        msgs = msgs.slice(0, -1)
      }
      // 移除对应的用户消息
      const lastUser = msgs[msgs.length - 1]
      if (lastUser && lastUser.role === 'user' && lastUser.content === lastFailedQuestion) {
        msgs = msgs.slice(0, -1)
      }
      return msgs
    })
    // 重新填入输入框并清除失败状态
    setInputValue(lastFailedQuestion)
    setLastFailedQuestion(null)
  }

  // 处理回车发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleDownload = () => {
    const content = `
AI 灵龙算命 - 命理分析报告
========================

基本信息
--------
姓名：${mingPan.userInfo.name}
性别：${mingPan.userInfo.gender}
八字：${mingPan.baZiString}
生成时间：${new Date(generatedAt).toLocaleString('zh-CN')}

总体概述
--------
${summary}

事业运势
--------
${analysis.career}

学业运势
--------
${analysis.education}

家庭运势
--------
${analysis.family}

财富运势
--------
${analysis.wealth}

健康运势
--------
${analysis.health}

关键年份
--------
${keyYears.map(ky => `${ky.year}：${ky.description}`).join('\n')}

改运建议
--------
${advice.map((a, i) => `${i + 1}. ${a}`).join('\n')}

========================
由 AI 灵龙算命系统生成
仅供参考，请理性看待
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `命理报告_${mingPan.userInfo.name}_${new Date().toLocaleDateString('zh-CN')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 报告头部 */}
      <Card variant="gold" className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">命理分析报告</CardTitle>
          <p className="text-sm text-mystic-400 mt-2">
            {mingPan.userInfo.name} · {mingPan.userInfo.gender} · 八字：{mingPan.baZiString}
          </p>
          <p className="text-xs text-mystic-500 mt-1">
            生成时间：{new Date(generatedAt).toLocaleString('zh-CN')}
          </p>
        </CardHeader>
      </Card>

      {/* 总体概述 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-gold-400" />
            总体概述
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-mystic-200 leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        </CardContent>
      </Card>

      {/* 五维运势分析 */}
      <Card>
        <CardHeader>
          <CardTitle>五维运势分析</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <AnalysisSection
            icon={<Briefcase className="w-5 h-5" />}
            title="事业运"
            content={analysis.career}
            color="#f59e0b"
          />
          <AnalysisSection
            icon={<GraduationCap className="w-5 h-5" />}
            title="学业运"
            content={analysis.education}
            color="#8b5cf6"
          />
          <AnalysisSection
            icon={<Home className="w-5 h-5" />}
            title="家庭运"
            content={analysis.family}
            color="#ec4899"
          />
          <AnalysisSection
            icon={<Coins className="w-5 h-5" />}
            title="财富运"
            content={analysis.wealth}
            color="#22c55e"
          />
          <AnalysisSection
            icon={<Heart className="w-5 h-5" />}
            title="健康运"
            content={analysis.health}
            color="#ef4444"
          />
        </CardContent>
      </Card>

      {/* 关键年份 */}
      {keyYears && keyYears.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gold-400" />
              关键年份预测
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {keyYears.map((ky) => (
                <div
                  key={`year_${ky.year}`}
                  className="p-4 rounded-lg bg-dark-900/50 border border-mystic-800/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gold-500/20 to-mystic-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold-400 font-bold text-sm text-center">
                        {ky.year}
                      </span>
                    </div>
                    <p className="text-mystic-300 leading-relaxed flex-1">
                      {ky.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 改运建议 */}
      {advice && advice.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-gold-400" />
              改运建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {advice.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gold-500/5 border border-gold-500/20"
                >
                  <span className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="text-mystic-200">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <Button variant="secondary" onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" />
          下载报告
        </Button>
        {onRestart && (
          <Button variant="gold" onClick={onRestart} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            重新开始
          </Button>
        )}
      </div>

      {/* 继续问答区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gold-400" />
            继续请教灵龙大师
          </CardTitle>
          <p className="text-sm text-mystic-400 mt-1">
            看完报告后还有疑问？可以继续向大师请教
          </p>
        </CardHeader>
        <CardContent>
          {/* 对话消息列表 */}
          {chatMessages.length > 0 && (
            <div className="mb-4 max-h-96 overflow-y-auto space-y-4 p-4 rounded-lg bg-dark-900/50 border border-mystic-800/50">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-gold-500/20 border border-gold-500/30 text-mystic-100'
                        : 'bg-mystic-800/50 border border-mystic-700/50 text-mystic-200'
                    }`}
                  >
                    <div className="text-xs text-mystic-500 mb-1">
                      {msg.role === 'user' ? '你' : '灵龙大师'}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {/* 重试按钮：最后一条是错误消息时显示 */}
              {lastFailedQuestion && !isLoading && (
                <div className="flex justify-center">
                  <button
                    onClick={handleRetryChat}
                    className="text-sm px-4 py-1.5 rounded-lg bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-500/30 transition-colors font-medium"
                  >
                    重新发送
                  </button>
                </div>
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-mystic-800/50 border border-mystic-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-mystic-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>灵龙大师正在思考...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* 输入区域 */}
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="请输入您想请教的问题..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-lg bg-dark-900 border border-mystic-700 text-mystic-100 placeholder-mystic-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 disabled:opacity-50"
            />
            <Button
              variant="gold"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 免责声明 */}
      <div className="text-center p-4 rounded-lg bg-mystic-950/50 border border-mystic-800/50">
        <p className="text-xs text-mystic-500">
          本报告由 AI 智能分析生成，仅供娱乐参考。命理学是传统文化的一部分，
          请理性看待分析结果，不宜过度迷信。人生掌握在自己手中，积极努力才是改变命运的根本。
        </p>
      </div>
    </div>
  )
}

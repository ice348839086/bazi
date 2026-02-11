'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Check, ChevronRight, Scroll, MessageCircle } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import type { AIQuestion, QuestionOption } from '@/types'

interface AnalysisMessage {
  id: string
  content: string
  timestamp: number
}

interface ChatInterfaceProps {
  analysisMessages: AnalysisMessage[]
  currentQuestions: AIQuestion[]
  onAnswer: (answers: Record<string, string>) => void
  isLoading?: boolean
  isComplete?: boolean
  onGenerateReport?: () => void
}

interface QuestionCardProps {
  question: AIQuestion
  selectedOption: string | null
  onSelect: (optionId: string) => void
  questionNumber: number
}

function QuestionCard({ question, selectedOption, onSelect, questionNumber }: QuestionCardProps) {
  return (
    <div className="animate-fadeIn">
      <div className="mb-3">
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center text-sm font-bold">
            {questionNumber}
          </span>
          <div>
            <h4 className="text-mystic-100 font-medium">{question.question}</h4>
            {question.context && (
              <p className="text-xs text-mystic-400 mt-1 italic">
                {question.context}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 ml-8">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`w-full p-3 rounded-lg text-left transition-all duration-200 border ${
              selectedOption === option.id
                ? 'bg-gold-500/20 border-gold-500/50 text-gold-200'
                : 'bg-dark-900/50 border-mystic-800/50 text-mystic-300 hover:bg-dark-800/50 hover:border-mystic-700/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                  selectedOption === option.id
                    ? 'border-gold-500 bg-gold-500'
                    : 'border-mystic-600'
                }`}
              >
                {selectedOption === option.id && (
                  <Check className="w-3 h-3 text-dark-950" />
                )}
              </div>
              <div className="flex-1">
                <span className="font-medium">{option.text}</span>
                {option.subtext && (
                  <p className="text-xs text-mystic-500 mt-0.5">{option.subtext}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ChatInterface({
  analysisMessages,
  currentQuestions,
  onAnswer,
  isLoading,
  isComplete,
  onGenerateReport,
}: ChatInterfaceProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [analysisMessages, currentQuestions])

  // 当问题变化时重置选择
  useEffect(() => {
    setSelectedAnswers({})
  }, [currentQuestions])

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
  }

  const handleSubmit = () => {
    // 检查是否所有问题都已回答
    const allAnswered = currentQuestions.every((q) => selectedAnswers[q.id])
    if (!allAnswered) return

    // 构建答案对象，使用 question.id 作为 key 避免重复问题冲突
    const answers: Record<string, string> = {}
    currentQuestions.forEach((q) => {
      const selectedOptionId = selectedAnswers[q.id]
      const selectedOption = q.options.find((opt) => opt.id === selectedOptionId)
      if (selectedOption) {
        // 使用 "id::question" 格式作为 key，确保唯一性
        const key = `${q.id}::${q.question}`
        answers[key] = selectedOption.text
      }
    })

    onAnswer(answers)
  }

  const allQuestionsAnswered = currentQuestions.length > 0 &&
    currentQuestions.every((q) => selectedAnswers[q.id])

  return (
    <div className="flex flex-col h-full max-h-[700px]">
      {/* 分析内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {analysisMessages.map((message) => (
          <div key={message.id} className="animate-fadeIn">
            {/* 大师头像和分析内容 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-dark-950" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gold-400 font-medium">灵龙大师</span>
                  <span className="text-xs text-mystic-500">
                    {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="bg-dark-800/80 border border-gold-500/20 rounded-2xl rounded-tl-md p-4">
                  <p className="text-mystic-200 leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 当前问题区域 */}
        {currentQuestions.length > 0 && !isLoading && (
          <div className="animate-fadeIn">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-gold-400" />
              <span className="text-mystic-300 font-medium">请回答以下问题</span>
            </div>

            <Card className="bg-dark-900/50 border-mystic-700/30">
              <div className="p-4 space-y-6">
                {currentQuestions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    selectedOption={selectedAnswers[question.id] || null}
                    onSelect={(optionId) => handleSelectOption(question.id, optionId)}
                    questionNumber={index + 1}
                  />
                ))}

                {/* 提交按钮 */}
                <div className="pt-4 border-t border-mystic-800/50">
                  <Button
                    variant="gold"
                    onClick={handleSubmit}
                    disabled={!allQuestionsAnswered}
                    className="w-full gap-2"
                  >
                    确认回答
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  {!allQuestionsAnswered && (
                    <p className="text-xs text-mystic-500 text-center mt-2">
                      请回答所有问题后继续
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="flex gap-3 animate-fadeIn">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-dark-950" />
            </div>
            <div className="bg-dark-800 border border-gold-500/20 p-4 rounded-2xl rounded-tl-md">
              <LoadingSpinner size="sm" text="灵龙大师正在分析您的回答..." />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 完成提示和生成报告按钮 */}
      {isComplete && onGenerateReport && (
        <div className="p-4 border-t border-mystic-800/50">
          <Card className="bg-gradient-to-r from-gold-500/10 to-mystic-500/10 border-gold-500/30">
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <Scroll className="w-6 h-6 text-gold-400" />
                <div>
                  <p className="text-mystic-100 font-medium">分析完成</p>
                  <p className="text-sm text-mystic-400">
                    信息收集完毕，可以生成详细运势报告了
                  </p>
                </div>
              </div>
              <Button variant="gold" onClick={onGenerateReport}>
                生成报告
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

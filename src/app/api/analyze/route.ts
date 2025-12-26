import { NextRequest, NextResponse } from 'next/server'
import { MASTER_SYSTEM_PROMPT, INITIAL_ANALYSIS_PROMPT, FOLLOW_UP_PROMPT, FINAL_REPORT_PROMPT, FOLLOW_UP_CHAT_PROMPT } from '@/lib/prompts'
import type { MingPan, AIQuestion, FortuneReport } from '@/types'
import { formatLunarDate } from '@/lib/bazi'

interface QARecord {
  question: string
  answer: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  type: 'initial' | 'followup' | 'report' | 'chat'
  mingPan: MingPan
  qaHistory?: QARecord[]
  roundNumber?: number
  // chat 类型额外需要的字段
  reportSummary?: string
  chatHistory?: ChatMessage[]
  userQuestion?: string
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 解析 AI 返回的 JSON
function parseAIResponse(content: string): any {
  // 尝试直接解析
  try {
    return JSON.parse(content)
  } catch {
    // 尝试提取 ```json ``` 中的内容
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1])
      } catch {
        // 继续尝试其他方式
      }
    }

    // 尝试提取 { } 中的内容
    const braceMatch = content.match(/\{[\s\S]*\}/)
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0])
      } catch {
        // 解析失败
      }
    }

    throw new Error('无法解析 AI 响应')
  }
}

async function callDeepSeekAPI(messages: DeepSeekMessage[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1'

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured')
  }

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.8,
      max_tokens: 2500,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { type, mingPan, qaHistory = [], roundNumber = 1 } = body

    if (!mingPan) {
      return NextResponse.json(
        { error: 'Missing mingPan data' },
        { status: 400 }
      )
    }

    const userInfo = {
      name: mingPan.userInfo.name,
      gender: mingPan.userInfo.gender,
      lunarDate: formatLunarDate(mingPan.lunarDate),
    }

    let messages: DeepSeekMessage[] = []
    let responseContent: string

    switch (type) {
      case 'initial': {
        // 初始分析
        messages = [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'user', content: INITIAL_ANALYSIS_PROMPT(mingPan.baZiString, userInfo) },
        ]
        responseContent = await callDeepSeekAPI(messages)

        try {
          const parsed = parseAIResponse(responseContent)

          // 验证并规范化问题格式
          const questions: AIQuestion[] = (parsed.questions || []).map((q: any, index: number) => ({
            id: q.id || `q${index + 1}`,
            question: q.question,
            context: q.context || '',
            options: (q.options || []).map((opt: any, optIndex: number) => ({
              id: opt.id || String.fromCharCode(97 + optIndex), // a, b, c, d
              text: opt.text,
              subtext: opt.subtext || undefined,
            })),
          }))

          return NextResponse.json({
            analysis: parsed.analysis || '正在分析您的八字...',
            questions,
            isComplete: false,
          })
        } catch (parseError) {
          console.error('Parse error:', parseError)
          // 返回原始内容作为分析，但不带问题
          return NextResponse.json({
            analysis: responseContent,
            questions: [],
            isComplete: false,
            error: '解析响应时出错，请重试',
          })
        }
      }

      case 'followup': {
        // 继续对话
        messages = [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'user', content: FOLLOW_UP_PROMPT(mingPan.baZiString, userInfo, qaHistory, roundNumber) },
        ]
        responseContent = await callDeepSeekAPI(messages)

        try {
          const parsed = parseAIResponse(responseContent)

          const questions: AIQuestion[] = (parsed.questions || []).map((q: any, index: number) => ({
            id: q.id || `q${roundNumber}_${index + 1}`,
            question: q.question,
            context: q.context || '',
            options: (q.options || []).map((opt: any, optIndex: number) => ({
              id: opt.id || String.fromCharCode(97 + optIndex),
              text: opt.text,
              subtext: opt.subtext || undefined,
            })),
          }))

          // 第3轮后强制完成问答（初始3题 + 第2轮1-2题 = 共4-5题）
          const forceComplete = roundNumber >= 3

          return NextResponse.json({
            analysis: parsed.analysis || '',
            questions: forceComplete ? [] : questions,
            isComplete: forceComplete || parsed.readyForReport === true,
          })
        } catch (parseError) {
          console.error('Parse error:', parseError)
          return NextResponse.json({
            analysis: responseContent,
            questions: [],
            isComplete: false,
            error: '解析响应时出错',
          })
        }
      }

      case 'report': {
        // 生成最终报告
        messages = [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'user', content: FINAL_REPORT_PROMPT(mingPan.baZiString, userInfo, qaHistory) },
        ]
        responseContent = await callDeepSeekAPI(messages)

        try {
          const reportData = parseAIResponse(responseContent)

          const report: FortuneReport = {
            id: `report_${Date.now()}`,
            mingPan,
            summary: reportData.summary || '命理分析报告',
            analysis: {
              career: reportData.analysis?.career || '暂无分析',
              education: reportData.analysis?.education || '暂无分析',
              family: reportData.analysis?.family || '暂无分析',
              wealth: reportData.analysis?.wealth || '暂无分析',
              health: reportData.analysis?.health || '暂无分析',
            },
            keyYears: reportData.keyYears || [],
            advice: reportData.advice || [],
            generatedAt: Date.now(),
          }

          return NextResponse.json({
            message: '报告生成成功',
            isComplete: true,
            report,
          })
        } catch (parseError) {
          console.error('Report parse error:', parseError)

          // 如果解析失败，创建一个基于原始文本的报告
          const fallbackReport: FortuneReport = {
            id: `report_${Date.now()}`,
            mingPan,
            summary: responseContent.slice(0, 500),
            analysis: {
              career: '请参阅总体分析',
              education: '请参阅总体分析',
              family: '请参阅总体分析',
              wealth: '请参阅总体分析',
              health: '请参阅总体分析',
            },
            keyYears: [],
            advice: ['保持积极心态', '顺应自然规律', '努力奋进'],
            generatedAt: Date.now(),
          }

          return NextResponse.json({
            message: '报告生成成功',
            isComplete: true,
            report: fallbackReport,
          })
        }
      }

      case 'chat': {
        // 报告生成后的继续问答
        const { reportSummary = '', chatHistory = [], userQuestion = '' } = body

        if (!userQuestion.trim()) {
          return NextResponse.json(
            { error: '请输入您的问题' },
            { status: 400 }
          )
        }

        messages = [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          {
            role: 'user',
            content: FOLLOW_UP_CHAT_PROMPT(
              mingPan.baZiString,
              userInfo,
              reportSummary,
              qaHistory,
              chatHistory,
              userQuestion
            )
          },
        ]
        responseContent = await callDeepSeekAPI(messages)

        return NextResponse.json({
          reply: responseContent,
          success: true,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

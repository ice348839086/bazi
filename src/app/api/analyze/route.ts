import { NextRequest, NextResponse } from 'next/server'
import { MASTER_SYSTEM_PROMPT, INITIAL_ANALYSIS_PROMPT, FOLLOW_UP_PROMPT, FINAL_REPORT_PROMPT, FOLLOW_UP_CHAT_PROMPT } from '@/lib/prompts'
import type { MingPan, AIQuestion, FortuneReport } from '@/types'
import { formatLunarDate } from '@/lib/bazi'

// --- 内存限流器：每个 IP 每小时最多 20 次请求 ---
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_QA_ROUNDS = 3 // 最大问答轮次，超过后强制完成
const MAX_QA_HISTORY_LENGTH = 20
const MAX_CHAT_HISTORY_LENGTH = 30
const MAX_RETRY_ATTEMPTS = 2

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

let rateLimitCheckCount = 0

function cleanupExpiredRecords(): void {
  const now = Date.now()
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now >= record.resetTime) {
      rateLimitMap.delete(ip)
    }
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()

  // 每 100 次调用清理一次过期记录，防止 Map 无限增长
  rateLimitCheckCount++
  if (rateLimitCheckCount % 100 === 0) {
    cleanupExpiredRecords()
  }

  const record = rateLimitMap.get(ip)

  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (now >= record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }

  record.count++
  return true
}

// --- 输入清洗：限制长度，过滤 prompt injection ---
const INJECTION_PATTERNS = [
  /忽略\s*以上\s*指令/i,
  /ignore\s*(previous|above|prior)\s*(instructions?|prompts?)/i,
  /system\s*:\s*/i,
  /<\s*script\s*>/i,
  /\[\s*INST\s*\]/i,
  /\[\s*\/?\s*INST\s*\]/i,
]

function sanitizeInput(text: string, maxLen: number): string {
  if (typeof text !== 'string') return ''
  let s = text.trim().slice(0, maxLen)
  for (const p of INJECTION_PATTERNS) {
    // 使用全局标志替换所有匹配项
    const globalPattern = new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g')
    s = s.replace(globalPattern, '')
  }
  return s.trim()
}

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

const API_TIMEOUT_MS = 45000
const REPORT_TIMEOUT_MS = 90000 // 报告生成需要更长时间

async function callDeepSeekAPI(messages: DeepSeekMessage[], maxTokens = 1500, timeoutMs = API_TIMEOUT_MS): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1'

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI 响应超时，请稍后重试')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callDeepSeekAPIWithRetry(messages: DeepSeekMessage[], maxTokens = 1500, timeoutMs = API_TIMEOUT_MS): Promise<string> {
  const maxAttempts = MAX_RETRY_ATTEMPTS
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callDeepSeekAPI(messages, maxTokens, timeoutMs)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  throw lastError ?? new Error('Internal server error')
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP) return realIP
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: '您的请求过于频繁，请一小时后重试' },
        { status: 429 }
      )
    }

    const body: RequestBody = await request.json()
    let { type, mingPan, qaHistory = [], roundNumber = 1 } = body

    if (!mingPan) {
      return NextResponse.json(
        { error: 'Missing mingPan data' },
        { status: 400 }
      )
    }

    // 请求体验证
    const validTypes = ['initial', 'followup', 'report', 'chat']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      )
    }

    if (
      !mingPan.userInfo ||
      !mingPan.baZi ||
      typeof mingPan.baZiString !== 'string' ||
      !mingPan.lunarDate ||
      !mingPan.wuXingStats ||
      !mingPan.dayMaster
    ) {
      return NextResponse.json(
        { error: 'Invalid mingPan structure' },
        { status: 400 }
      )
    }

    if (qaHistory.length > MAX_QA_HISTORY_LENGTH) {
      return NextResponse.json(
        { error: `qaHistory exceeds maximum length (${MAX_QA_HISTORY_LENGTH})` },
        { status: 400 }
      )
    }

    roundNumber = Math.min(Math.max(1, Math.floor(Number(roundNumber) || 1)), 10)

    if (body.chatHistory && body.chatHistory.length > MAX_CHAT_HISTORY_LENGTH) {
      return NextResponse.json(
        { error: `chatHistory exceeds maximum length (${MAX_CHAT_HISTORY_LENGTH})` },
        { status: 400 }
      )
    }

    mingPan.userInfo.name = sanitizeInput(mingPan.userInfo.name, 20)
    if (!mingPan.userInfo.name) {
      return NextResponse.json(
        { error: '姓名不能为空' },
        { status: 400 }
      )
    }
    mingPan.userInfo.gender = mingPan.userInfo.gender === '女' ? '女' : '男'
    if (mingPan.userInfo.birthPlace) {
      mingPan.userInfo.birthPlace = sanitizeInput(mingPan.userInfo.birthPlace, 50)
    }

    for (const qa of qaHistory) {
      qa.question = sanitizeInput(qa.question, 500)
      qa.answer = sanitizeInput(qa.answer, 500)
    }

    if (body.chatHistory) {
      for (const msg of body.chatHistory) {
        if (msg.content) msg.content = sanitizeInput(msg.content, 500)
      }
    }

    // userQuestion 和 reportSummary 在 chat case 中局部 sanitize

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
        responseContent = await callDeepSeekAPIWithRetry(messages)

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
        responseContent = await callDeepSeekAPIWithRetry(messages)

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
        // 生成最终报告（报告内容多，需要更多 token）
        messages = [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'user', content: FINAL_REPORT_PROMPT(mingPan.baZiString, userInfo, qaHistory) },
        ]
        responseContent = await callDeepSeekAPIWithRetry(messages, 2500, REPORT_TIMEOUT_MS)

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
        const { chatHistory = [] } = body
        const reportSummary = sanitizeInput(body.reportSummary || '', 2000)
        const userQuestion = sanitizeInput(body.userQuestion || '', 500)

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
        responseContent = await callDeepSeekAPIWithRetry(messages)

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

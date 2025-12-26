// 天干
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'

// 地支
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'

// 五行
export type WuXing = '金' | '木' | '水' | '火' | '土'

// 时辰选项
export interface ShiChen {
  name: string
  label: string
  range: string
}

// 用户输入信息
export interface UserInfo {
  name: string
  gender: '男' | '女'
  birthDate: string // YYYY-MM-DD
  birthTime: string // 时辰
  birthPlace?: string // 可选：出生地点
}

// 八字信息
export interface BaZi {
  yearPillar: {
    tianGan: TianGan
    diZhi: DiZhi
  }
  monthPillar: {
    tianGan: TianGan
    diZhi: DiZhi
  }
  dayPillar: {
    tianGan: TianGan
    diZhi: DiZhi
  }
  hourPillar: {
    tianGan: TianGan
    diZhi: DiZhi
  }
}

// 五行统计
export interface WuXingStats {
  金: number
  木: number
  水: number
  火: number
  土: number
}

// 完整的命盘信息
export interface MingPan {
  userInfo: UserInfo
  lunarDate: {
    year: number
    month: number
    day: number
    isLeap: boolean
  }
  baZi: BaZi
  baZiString: string // 四柱文字形式，如 "甲子 乙丑 丙寅 丁卯"
  wuXingStats: WuXingStats
  dayMaster: TianGan // 日主
}

// 聊天消息
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

// AI 选择题选项
export interface QuestionOption {
  id: string
  text: string
  subtext?: string // 可选的补充说明
}

// AI 提问（选择题形式）
export interface AIQuestion {
  id: string
  question: string
  context?: string // 问题的背景说明
  options: QuestionOption[]
  allowMultiple?: boolean // 是否允许多选
}

// 会话状态
export type SessionPhase =
  | 'input'      // 信息录入阶段
  | 'analyzing'  // 分析中
  | 'inquiry'    // 互动问答阶段
  | 'generating' // 生成报告中
  | 'report'     // 查看报告阶段

// 运势报告
export interface FortuneReport {
  id: string
  mingPan: MingPan
  summary: string
  analysis: {
    career: string
    education: string
    family: string
    wealth: string
    health: string
  }
  keyYears: Array<{
    year: string
    description: string
  }>
  advice: string[]
  generatedAt: number
}

// API 请求/响应类型
export interface AnalysisRequest {
  mingPan: MingPan
  conversationHistory?: ChatMessage[]
  userAnswer?: string
}

export interface AnalysisResponse {
  message: string
  questions?: AIQuestion[]
  isComplete: boolean
  report?: FortuneReport
}

// Store 状态
export interface DivinationState {
  phase: SessionPhase
  userInfo: UserInfo | null
  mingPan: MingPan | null
  messages: ChatMessage[]
  currentQuestions: AIQuestion[]
  report: FortuneReport | null
  isLoading: boolean
  error: string | null
}

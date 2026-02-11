import { create } from 'zustand'
import type { DivinationState, UserInfo, MingPan, ChatMessage, AIQuestion, FortuneReport, SessionPhase } from '@/types'

/** Extended state for session persistence (defined locally, not in types) */
interface AnalysisMessage {
  id: string
  content: string
  timestamp: number
}

interface QARecord {
  question: string
  answer: string
}

interface ExtendedDivinationState extends DivinationState {
  analysisMessages: AnalysisMessage[]
  qaHistory: QARecord[]
  roundNumber: number
  isComplete: boolean
}

interface DivinationActions {
  setPhase: (phase: SessionPhase) => void
  setUserInfo: (userInfo: UserInfo) => void
  setMingPan: (mingPan: MingPan) => void
  addMessage: (message: ChatMessage) => void
  setMessages: (messages: ChatMessage[]) => void
  setCurrentQuestions: (questions: AIQuestion[]) => void
  setReport: (report: FortuneReport) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  addAnalysisMessage: (message: AnalysisMessage) => void
  setAnalysisMessages: (messages: AnalysisMessage[]) => void
  setQaHistory: (history: QARecord[]) => void
  setRoundNumber: (round: number) => void
  setIsComplete: (complete: boolean) => void
  restoreSession: () => void
  reset: () => void
}

const SESSION_KEY = 'divination-session'
const SESSION_MAX_SIZE = 4 * 1024 * 1024 // 4MB safety threshold

const initialState: ExtendedDivinationState = {
  phase: 'input',
  userInfo: null,
  mingPan: null,
  messages: [],
  currentQuestions: [],
  report: null,
  isLoading: false,
  error: null,
  analysisMessages: [],
  qaHistory: [],
  roundNumber: 1,
  isComplete: false,
}

function persistToSessionStorage(state: ExtendedDivinationState): void {
  if (typeof window === 'undefined') return
  try {
    const toPersist = {
      phase: state.phase,
      mingPan: state.mingPan,
      report: state.report,
      analysisMessages: state.analysisMessages,
      currentQuestions: state.currentQuestions,
      qaHistory: state.qaHistory,
      roundNumber: state.roundNumber,
      isComplete: state.isComplete,
    }
    const serialized = JSON.stringify(toPersist)
    if (serialized.length > SESSION_MAX_SIZE) {
      // 超出容量时不持久化 report（最大的数据块）
      const fallback = { ...toPersist, report: null }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(fallback))
    } else {
      sessionStorage.setItem(SESSION_KEY, serialized)
    }
  } catch {
    // ignore persistence errors (e.g. QuotaExceededError)
  }
}

function clearSessionStorage(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export const useDivinationStore = create<ExtendedDivinationState & DivinationActions>((set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  setUserInfo: (userInfo) => set({ userInfo }),

  setMingPan: (mingPan) => set({ mingPan }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),

  setCurrentQuestions: (questions) => set({ currentQuestions: questions }),

  setReport: (report) => set({ report }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  addAnalysisMessage: (message) =>
    set((state) => ({
      analysisMessages: [...state.analysisMessages, message],
    })),

  setAnalysisMessages: (messages) => set({ analysisMessages: messages }),

  setQaHistory: (history) => set({ qaHistory: history }),

  setRoundNumber: (round) => set({ roundNumber: round }),

  setIsComplete: (complete) => set({ isComplete: complete }),

  restoreSession: () => {
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        phase?: SessionPhase
        mingPan?: MingPan | null
        report?: FortuneReport | null
        analysisMessages?: AnalysisMessage[]
        currentQuestions?: AIQuestion[]
        qaHistory?: QARecord[]
        roundNumber?: number
        isComplete?: boolean
      }
      const mingPan = parsed.mingPan ?? null
      const report = parsed.report ?? null
      // Sanitize phase: 'analyzing'/'generating' cannot be resumed, map to 'inquiry'
      let phase = parsed.phase ?? 'input'
      if (phase === 'analyzing' || phase === 'generating') {
        phase = 'inquiry'
      }
      set((state) => ({
        ...state,
        phase,
        mingPan,
        userInfo: mingPan?.userInfo ?? state.userInfo,
        report,
        analysisMessages: parsed.analysisMessages ?? state.analysisMessages,
        currentQuestions: parsed.currentQuestions ?? state.currentQuestions,
        qaHistory: parsed.qaHistory ?? state.qaHistory,
        roundNumber: parsed.roundNumber ?? state.roundNumber,
        isComplete: parsed.isComplete ?? state.isComplete,
      }))
    } catch {
      // ignore restore errors
    }
  },

  reset: () => {
    clearSessionStorage()
    set(initialState)
  },
}))

// Subscribe to persist on state change (excluding loading/error/messages/currentQuestions)
useDivinationStore.subscribe((state) => {
  // Skip persist when in empty/reset state - sessionStorage stays cleared after reset
  if (state.phase === 'input' && !state.mingPan && !state.report &&
      state.analysisMessages.length === 0 && state.qaHistory.length === 0 &&
      state.roundNumber === 1 && !state.isComplete) {
    return
  }
  persistToSessionStorage(state)
})

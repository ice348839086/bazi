import { create } from 'zustand'
import type { DivinationState, UserInfo, MingPan, ChatMessage, AIQuestion, FortuneReport, SessionPhase } from '@/types'

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
  reset: () => void
}

const initialState: DivinationState = {
  phase: 'input',
  userInfo: null,
  mingPan: null,
  messages: [],
  currentQuestions: [],
  report: null,
  isLoading: false,
  error: null,
}

export const useDivinationStore = create<DivinationState & DivinationActions>((set) => ({
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

  reset: () => set(initialState),
}))

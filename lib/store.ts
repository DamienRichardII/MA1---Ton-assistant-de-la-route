'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Profile {
  level: string;
  score_total: number;
  score_correct: number;
  weak_topics: string[];
  strong_topics: string[];
  theme_scores: Record<string, { correct: number; total: number }>;
  plan_day: number;
  exam_results: Array<{ date: string; correct: number; total: number; pct: number; passed: boolean }>;
  xp: number;
}

export interface AppState {
  // User
  userId: string;
  token: string | null;
  userName: string;
  plan: 'free' | 'premium' | 'autoecole';
  isLoggedIn: boolean;
  userRole: 'apprenti' | 'moniteur';

  // UI
  lightMode: boolean;

  // Profile
  profile: Profile;

  // Usage
  qUsed: number;
  qMax: number;

  // QCM
  topic: string;
  qcmCorrect: number;
  qcmWrong: number;
  qcmStreak: number;
  qcmTotal: number;

  // Gamification
  xp: number;
  streakDays: number;
  lastDay: string;
  badges: Record<string, boolean>;

  // Exam usage tracking
  examUsedToday: number;
  examLastDate: string;

  // Actions
  setUser: (data: { userId: string; token: string; name: string; plan: string; role?: string }) => void;
  logout: () => void;
  setProfile: (profile: Partial<Profile>) => void;
  incrementQuestion: () => void;
  recordAnswer: (correct: boolean) => void;
  addXP: (amount: number) => void;
  setTopic: (topic: string) => void;
  setPlan: (plan: 'free' | 'premium' | 'autoecole') => void;
  toggleLightMode: () => void;
  setUserRole: (role: 'apprenti' | 'moniteur') => void;
  incrementExamUsed: () => void;
  canUseExam: () => boolean;
}

const generateUserId = () => 'u_' + Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      userId: generateUserId(),
      token: null,
      userName: '',
      plan: 'free',
      isLoggedIn: false,
      userRole: 'apprenti',
      lightMode: false,
      profile: {
        level: 'debutant', score_total: 0, score_correct: 0,
        weak_topics: [], strong_topics: [], theme_scores: {},
        plan_day: 0, exam_results: [], xp: 0,
      },
      qUsed: 0, qMax: 10,
      topic: 'vitesse',
      qcmCorrect: 0, qcmWrong: 0, qcmStreak: 0, qcmTotal: 0,
      xp: 0, streakDays: 0, lastDay: '', badges: {},
      examUsedToday: 0, examLastDate: '',

      setUser: (data) => set({
        userId: data.userId, token: data.token,
        userName: data.name, plan: data.plan as any,
        isLoggedIn: true,
        userRole: (data.role === 'moniteur' ? 'moniteur' : 'apprenti') as any,
        qMax: data.plan === 'free' ? 10 : 999,
      }),

      logout: () => set({
        token: null, userName: '', plan: 'free',
        isLoggedIn: false, userId: generateUserId(), qMax: 10,
        userRole: 'apprenti',
      }),

      setProfile: (profile) => set((state) => ({
        profile: { ...state.profile, ...profile },
      })),

      incrementQuestion: () => set((state) => ({ qUsed: state.qUsed + 1 })),

      recordAnswer: (correct) => set((state) => ({
        qcmTotal: state.qcmTotal + 1,
        qcmCorrect: state.qcmCorrect + (correct ? 1 : 0),
        qcmWrong: state.qcmWrong + (correct ? 0 : 1),
        qcmStreak: correct ? state.qcmStreak + 1 : 0,
        xp: state.xp + (correct ? 10 : 0),
      })),

      addXP: (amount) => set((state) => ({ xp: state.xp + amount })),
      setTopic: (topic) => set({ topic }),
      setPlan: (plan) => set({ plan, qMax: plan === 'free' ? 10 : 999 }),
      toggleLightMode: () => set((state) => ({ lightMode: !state.lightMode })),
      setUserRole: (role) => set({ userRole: role }),

      incrementExamUsed: () => set((state) => {
        const today = todayStr();
        if (state.examLastDate !== today) {
          return { examUsedToday: 1, examLastDate: today };
        }
        return { examUsedToday: state.examUsedToday + 1 };
      }),

      canUseExam: () => {
        const state = get();
        if (state.plan !== 'free') return true;
        const today = todayStr();
        if (state.examLastDate !== today) return true;
        return state.examUsedToday < 2;
      },
    }),
    { name: 'ma1-store-v9' }
  )
);

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface InvestorData {
  name: string
  label: string
  type: string
  expires: string | null
  session: string
  valid: boolean
}

interface AppState {
  lang: 'ar' | 'en'
  token: string | null
  investorData: InvestorData | null
  ndaAccepted: boolean
  toggleLang: () => void
  setLang: (lang: 'ar' | 'en') => void
  setToken: (token: string, data: InvestorData) => void
  setNdaAccepted: (v: boolean) => void
  clearSession: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'ar',
      token: null,
      investorData: null,
      ndaAccepted: false,

      toggleLang: () => set((s) => ({ lang: s.lang === 'ar' ? 'en' : 'ar' })),
      setLang: (lang) => set({ lang }),
      setToken: (token, data) => {
        sessionStorage.setItem('mcr_investor', '1')
        set({ token, investorData: data })
      },
      setNdaAccepted: (v) => set({ ndaAccepted: v }),
      clearSession: () => {
        sessionStorage.removeItem('mcr_investor')
        set({ token: null, investorData: null, ndaAccepted: false })
      },
    }),
    {
      name: 'mcr-store',
      // Use sessionStorage instead of localStorage — session ends when tab closes
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ lang: s.lang, token: s.token, investorData: s.investorData }),
    }
  )
)


import { create } from 'zustand'

export interface MockMail {
  id: string
  to: string
  subject: string
  html: string
  receivedAt: string
}

interface MailStore {
  emails: MockMail[]
  isOpen: boolean
  addEmail: (email: Omit<MockMail, 'id' | 'receivedAt'>) => void
  removeEmail: (id: string) => void
  clearAll: () => void
  setOpen: (open: boolean) => void
}

export const useMailStore = create<MailStore>((set) => ({
  emails: [],
  isOpen: false,
  addEmail: (email) => set((state) => ({
    emails: [
      {
        ...email,
        id: Math.random().toString(36).substring(7),
        receivedAt: new Date().toISOString()
      },
      ...state.emails
    ],
    isOpen: true // Auto-open when new mail arrives
  })),
  removeEmail: (id) => set((state) => ({
    emails: state.emails.filter((e) => e.id !== id)
  })),
  clearAll: () => set({ emails: [] }),
  setOpen: (open) => set({ isOpen: open })
}))

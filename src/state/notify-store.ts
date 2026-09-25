import { create } from 'zustand';

export interface Notice {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

interface NotifyState {
  notices: Notice[];
  dismiss(id: number): void;
}

let nextId = 1;
const LIFETIME_MS = 5000;

export const useNotifyStore = create<NotifyState>()((set) => ({
  notices: [],
  dismiss: (id) => set((s) => ({ notices: s.notices.filter((t) => t.id !== id) })),
}));

/** Show a short, self-dismissing message to the user (any layer may call this; the UI renders it). */
export function notify(message: string, tone: Notice['tone'] = 'error'): void {
  const id = nextId++;
  useNotifyStore.setState((s) => ({ notices: [...s.notices.slice(-2), { id, message, tone }] }));
  setTimeout(() => useNotifyStore.getState().dismiss(id), LIFETIME_MS);
}

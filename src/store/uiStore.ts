import { create } from 'zustand';
import type { Locale } from '../types';

type Theme = 'light' | 'dark';

interface UIState {
  selectedPersonId: string | null;
  focusPersonId: string | null;
  locale: Locale;
  theme: Theme;
  generationFilter: number;
  surnameFilter: string[];
  searchQuery: string;
  isProfileOpen: boolean;
  setSelectedPerson: (id: string | null) => void;
  setFocusPerson: (id: string | null) => void;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  setGenerationFilter: (n: number) => void;
  setSurnameFilter: (surnames: string[]) => void;
  setSearchQuery: (q: string) => void;
  closeProfile: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  selectedPersonId: null,
  focusPersonId: null,
  locale: (localStorage.getItem('locale') as Locale) ?? 'en',
  theme: (localStorage.getItem('theme') as Theme) ?? 'light',
  generationFilter: 0,
  surnameFilter: [],
  searchQuery: '',
  isProfileOpen: false,

  setSelectedPerson: (id) => set({ selectedPersonId: id, isProfileOpen: id !== null }),
  setFocusPerson: (id) => set({ focusPersonId: id }),
  setLocale: (locale) => {
    localStorage.setItem('locale', locale);
    set({ locale });
  },
  toggleTheme: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    set({ theme: next });
  },
  setGenerationFilter: (n) => set({ generationFilter: n }),
  setSurnameFilter: (surnames) => set({ surnameFilter: surnames }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  closeProfile: () => set({ isProfileOpen: false, selectedPersonId: null }),
}));

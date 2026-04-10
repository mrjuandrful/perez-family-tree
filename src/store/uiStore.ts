import { create } from 'zustand';
import type { Locale } from '../types';

interface UIState {
  selectedPersonId: string | null;
  focusPersonId: string | null;
  locale: Locale;
  generationFilter: number;
  surnameFilter: string[];
  searchQuery: string;
  isProfileOpen: boolean;
  setSelectedPerson: (id: string | null) => void;
  setFocusPerson: (id: string | null) => void;
  setLocale: (locale: Locale) => void;
  setGenerationFilter: (n: number) => void;
  setSurnameFilter: (surnames: string[]) => void;
  setSearchQuery: (q: string) => void;
  closeProfile: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedPersonId: null,
  focusPersonId: null,
  locale: (localStorage.getItem('locale') as Locale) ?? 'en',
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
  setGenerationFilter: (n) => set({ generationFilter: n }),
  setSurnameFilter: (surnames) => set({ surnameFilter: surnames }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  closeProfile: () => set({ isProfileOpen: false, selectedPersonId: null }),
}));

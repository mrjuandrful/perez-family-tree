import { create } from 'zustand';
import type { FamilyTreeData, Person, Family, Media } from '../types';
import seedData from '../data/perez-family.json';

const STORAGE_KEY = 'perez-family-tree-data';
const SEED_VERSION = 'v7'; // bump this whenever seed data changes to bust cached data
const SEED_VERSION_KEY = 'perez-family-tree-seed-version';

function loadData(): FamilyTreeData {
  try {
    const storedVersion = localStorage.getItem(SEED_VERSION_KEY);
    if (storedVersion !== SEED_VERSION) {
      // Seed data changed — clear stale cache
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as FamilyTreeData;
  } catch {
    // fall through to seed
  }
  return seedData as FamilyTreeData;
}

interface FamilyTreeState {
  data: FamilyTreeData;
  setPerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  setFamily: (family: Family) => void;
  deleteFamily: (id: string) => void;
  setMedia: (media: Media) => void;
  deleteMedia: (id: string) => void;
  importData: (data: FamilyTreeData, mode: 'replace' | 'merge') => void;
  persist: () => void;
}

export const useFamilyTreeStore = create<FamilyTreeState>((set, get) => ({
  data: loadData(),

  setPerson: (person) => set((state) => {
    const updated = {
      ...state.data,
      persons: { ...state.data.persons, [person.id]: person },
      meta: { ...state.data.meta, updatedAt: new Date().toISOString() },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { data: updated };
  }),

  deletePerson: (id) => set((state) => {
    const persons = { ...state.data.persons };
    delete persons[id];
    const updated = { ...state.data, persons, meta: { ...state.data.meta, updatedAt: new Date().toISOString() } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { data: updated };
  }),

  setFamily: (family) => set((state) => {
    const updated = {
      ...state.data,
      families: { ...state.data.families, [family.id]: family },
      meta: { ...state.data.meta, updatedAt: new Date().toISOString() },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { data: updated };
  }),

  deleteFamily: (id) => set((state) => {
    const families = { ...state.data.families };
    delete families[id];
    const updated = { ...state.data, families, meta: { ...state.data.meta, updatedAt: new Date().toISOString() } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { data: updated };
  }),

  setMedia: (media) => set((state) => {
    const updated = {
      ...state.data,
      media: { ...state.data.media, [media.id]: media },
      meta: { ...state.data.meta, updatedAt: new Date().toISOString() },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { data: updated };
  }),

  deleteMedia: (id) => set((state) => {
    const media = { ...state.data.media };
    delete media[id];
    const updated = { ...state.data, media, meta: { ...state.data.meta, updatedAt: new Date().toISOString() } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { data: updated };
  }),

  importData: (incoming, mode) => set((state) => {
    const updated: FamilyTreeData = mode === 'replace'
      ? incoming
      : {
          ...state.data,
          persons: { ...state.data.persons, ...incoming.persons },
          families: { ...state.data.families, ...incoming.families },
          media: { ...state.data.media, ...incoming.media },
          meta: { ...state.data.meta, updatedAt: new Date().toISOString() },
        };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { data: updated };
  }),

  persist: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get().data));
  },
}));

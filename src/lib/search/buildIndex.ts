import Fuse from 'fuse.js';
import type { FamilyTreeData, Person } from '../../types';

export interface SearchableItem {
  id: string;
  nameEn: string;
  nameEs: string;
  surnameEn: string;
  surnameEs: string;
  bioEn: string;
  bioEs: string;
  notesEn: string;
  tags: string;
  birthYear: string;
  birthPlace: string;
}

function personToSearchable(p: Person): SearchableItem {
  return {
    id: p.id,
    nameEn: `${p.names.given.en} ${p.names.surname.en}`,
    nameEs: `${p.names.given.es} ${p.names.surname.es}`,
    surnameEn: p.names.surname.en,
    surnameEs: p.names.surname.es,
    bioEn: p.bio?.en ?? '',
    bioEs: p.bio?.es ?? '',
    notesEn: p.notes?.en ?? '',
    tags: (p.tags ?? []).join(' '),
    birthYear: p.birth?.date?.year?.toString() ?? '',
    birthPlace: p.birth?.place?.display.en ?? '',
  };
}

export function buildSearchIndex(data: FamilyTreeData) {
  const items = Object.values(data.persons).map(personToSearchable);

  const fuse = new Fuse(items, {
    keys: [
      { name: 'nameEn', weight: 3 },
      { name: 'nameEs', weight: 3 },
      { name: 'surnameEn', weight: 2 },
      { name: 'surnameEs', weight: 2 },
      { name: 'bioEn', weight: 1 },
      { name: 'bioEs', weight: 1 },
      { name: 'notesEn', weight: 0.5 },
      { name: 'tags', weight: 1 },
      { name: 'birthYear', weight: 1 },
      { name: 'birthPlace', weight: 0.5 },
    ],
    threshold: 0.35,
    includeScore: true,
  });

  return fuse;
}

import type { FamilyTreeData, Person } from '../types';

export type RelationshipLabel =
  | 'father' | 'mother' | 'partner' | 'child' | 'sibling'
  | 'adopted_child' | 'step_child';

export interface Relative {
  person: Person;
  relationship: RelationshipLabel;
}

export function getRelatives(personId: string, data: FamilyTreeData): Relative[] {
  const relatives: Relative[] = [];
  const person = data.persons[personId];
  if (!person) return relatives;

  for (const fam of Object.values(data.families)) {
    const isPartner = fam.partners.some((p) => p.personId === personId);
    const isChild = fam.children.some((c) => c.personId === personId);

    if (isPartner) {
      // Other partners
      for (const p of fam.partners) {
        if (p.personId === personId) continue;
        const rel = data.persons[p.personId];
        if (rel) relatives.push({ person: rel, relationship: 'partner' });
      }
      // Children
      for (const c of fam.children) {
        const rel = data.persons[c.personId];
        if (!rel) continue;
        const label: RelationshipLabel =
          c.relationship === 'adopted' ? 'adopted_child' :
          c.relationship === 'step' ? 'step_child' : 'child';
        relatives.push({ person: rel, relationship: label });
      }
    }

    if (isChild) {
      // Parents
      for (const p of fam.partners) {
        const rel = data.persons[p.personId];
        if (!rel) continue;
        const label: RelationshipLabel = rel.gender === 'female' ? 'mother' : 'father';
        relatives.push({ person: rel, relationship: label });
      }
      // Siblings
      for (const c of fam.children) {
        if (c.personId === personId) continue;
        const rel = data.persons[c.personId];
        if (rel) relatives.push({ person: rel, relationship: 'sibling' });
      }
    }
  }

  // Deduplicate by personId
  const seen = new Set<string>();
  return relatives.filter((r) => {
    if (seen.has(r.person.id)) return false;
    seen.add(r.person.id);
    return true;
  });
}

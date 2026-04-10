import type { FamilyTreeData, FuzzyDate } from '../../types';

function formatDate(d?: FuzzyDate): string {
  if (!d) return '';
  if (d.raw) return d.raw;
  if (!d.year) return '';
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const prefix = d.circa ? 'ABT ' : d.before ? 'BEF ' : d.after ? 'AFT ' : '';
  const parts: string[] = [];
  if (d.day) parts.push(String(d.day));
  if (d.month) parts.push(months[d.month - 1]);
  parts.push(String(d.year));
  return `${prefix}${parts.join(' ')}`;
}

export function exportGedcom(data: FamilyTreeData): string {
  const lines: string[] = [
    '0 HEAD',
    '1 SOUR perez-family-tree',
    '1 GEDC',
    '2 VERS 5.5.1',
    '1 CHAR UTF-8',
    `1 DATE ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`,
  ];

  for (const person of Object.values(data.persons)) {
    const gedId = person.externalRefs?.gedcomId ?? `@${person.id}@`;
    lines.push(`0 ${gedId} INDI`);
    const name = `${person.names.given.en} /${person.names.surname.en}/`;
    lines.push(`1 NAME ${name}`);
    if (person.names.given.en) lines.push(`2 GIVN ${person.names.given.en}`);
    if (person.names.surname.en) lines.push(`2 SURN ${person.names.surname.en}`);
    if (person.gender === 'male') lines.push('1 SEX M');
    else if (person.gender === 'female') lines.push('1 SEX F');

    if (person.birth) {
      lines.push('1 BIRT');
      const d = formatDate(person.birth.date);
      if (d) lines.push(`2 DATE ${d}`);
      if (person.birth.place) lines.push(`2 PLAC ${person.birth.place.display.en}`);
    }
    if (person.death) {
      lines.push('1 DEAT');
      const d = formatDate(person.death.date);
      if (d) lines.push(`2 DATE ${d}`);
      if (person.death.place) lines.push(`2 PLAC ${person.death.place.display.en}`);
    }
    if (person.burial) {
      lines.push('1 BURI');
      const d = formatDate(person.burial.date);
      if (d) lines.push(`2 DATE ${d}`);
      if (person.burial.place) lines.push(`2 PLAC ${person.burial.place.display.en}`);
    }
  }

  for (const fam of Object.values(data.families)) {
    const gedId = fam.gedcomId ?? `@${fam.id}@`;
    lines.push(`0 ${gedId} FAM`);

    const [p1, p2] = fam.partners;
    if (p1) {
      const person = data.persons[p1.personId];
      const ref = person?.externalRefs?.gedcomId ?? `@${p1.personId}@`;
      const tag = person?.gender === 'female' ? 'WIFE' : 'HUSB';
      lines.push(`1 ${tag} ${ref}`);
    }
    if (p2) {
      const person = data.persons[p2.personId];
      const ref = person?.externalRefs?.gedcomId ?? `@${p2.personId}@`;
      const tag = person?.gender === 'female' ? 'WIFE' : 'HUSB';
      lines.push(`1 ${tag} ${ref}`);
    }

    if (fam.union) {
      lines.push('1 MARR');
      const d = formatDate(fam.union.date);
      if (d) lines.push(`2 DATE ${d}`);
      if (fam.union.place) lines.push(`2 PLAC ${fam.union.place.display.en}`);
    }

    for (const child of fam.children) {
      const person = data.persons[child.personId];
      const ref = person?.externalRefs?.gedcomId ?? `@${child.personId}@`;
      lines.push(`1 CHIL ${ref}`);
    }
  }

  lines.push('0 TRLR');
  return lines.join('\r\n');
}

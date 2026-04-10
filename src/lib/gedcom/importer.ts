import { parse } from 'parse-gedcom';
import type { FamilyTreeData, Person, Family } from '../../types';

function now() {
  return new Date().toISOString();
}

interface GedcomNode {
  type: string;
  value?: string;
  data?: { xref_id?: string; formal_name?: string; pointer?: string };
  children: GedcomNode[];
}

interface GedcomRoot {
  type: 'root';
  children: GedcomNode[];
}

function getChild(node: GedcomNode, type: string): GedcomNode | undefined {
  return node.children.find((c) => c.type === type);
}

function getChildren(node: GedcomNode, type: string): GedcomNode[] {
  return node.children.filter((c) => c.type === type);
}

function parseGedcomDate(dateStr: string | undefined): import('../../types').FuzzyDate | undefined {
  if (!dateStr) return undefined;
  const circa = /ABT|CAL|EST/i.test(dateStr);
  const before = /BEF/i.test(dateStr);
  const after = /AFT/i.test(dateStr);
  const clean = dateStr.replace(/ABT|CAL|EST|BEF|AFT/gi, '').trim();
  const yearMatch = clean.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;
  if (!year) return { raw: dateStr };
  const monthMap: Record<string, number> = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
  };
  const monthMatch = clean.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i);
  const month = monthMatch ? monthMap[monthMatch[1].toUpperCase()] : undefined;
  const dayMatch = clean.match(/^(\d{1,2})\s+[A-Z]{3}/i);
  const day = dayMatch ? parseInt(dayMatch[1], 10) : undefined;
  return { year, month, day, circa, before, after };
}

function xrefToId(xref: string | undefined): string {
  return `P-${(xref ?? '').replace(/@/g, '').replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function famXrefToId(xref: string | undefined): string {
  return `F-${(xref ?? '').replace(/@/g, '').replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function parseEvent(node: GedcomNode | undefined) {
  if (!node) return undefined;
  const dateNode = getChild(node, 'DATE');
  const placeNode = getChild(node, 'PLAC');
  const dateStr = dateNode?.value;
  const placeStr = placeNode?.value;
  return {
    date: parseGedcomDate(dateStr),
    place: placeStr ? { display: { en: placeStr, es: placeStr } } : undefined,
  };
}

export function importGedcom(gedcomText: string): { data: FamilyTreeData; errors: string[] } {
  const errors: string[] = [];
  let parsed: GedcomRoot;
  try {
    parsed = parse(gedcomText) as GedcomRoot;
  } catch (e) {
    return {
      data: {
        meta: {
          version: '1.0',
          title: { en: 'Imported Tree', es: 'Árbol Importado' },
          createdAt: now(),
          updatedAt: now(),
        },
        persons: {},
        families: {},
        media: {},
      },
      errors: [`Failed to parse GEDCOM: ${String(e)}`],
    };
  }

  const persons: Record<string, Person> = {};
  const families: Record<string, Family> = {};

  const indiNodes = (parsed.children ?? []).filter((n) => n.type === 'INDI');
  for (const indi of indiNodes) {
    const gedcomId = indi.data?.xref_id ?? '';
    const id = xrefToId(gedcomId);

    const nameNode = getChild(indi, 'NAME');
    const rawName = nameNode?.value ?? 'Unknown';
    const surnameMatch = rawName.match(/\/([^/]+)\//);
    const surname = surnameMatch ? surnameMatch[1].trim() : '';
    const given = rawName.replace(/\/[^/]*\//, '').trim() || 'Unknown';

    const sexNode = getChild(indi, 'SEX');
    const sex = (sexNode?.value ?? '').toUpperCase();
    const gender: Person['gender'] = sex === 'M' ? 'male' : sex === 'F' ? 'female' : 'unknown';

    persons[id] = {
      id,
      names: {
        given: { en: given, es: given },
        surname: { en: surname, es: surname },
      },
      gender,
      birth: parseEvent(getChild(indi, 'BIRT')),
      death: parseEvent(getChild(indi, 'DEAT')),
      burial: parseEvent(getChild(indi, 'BURI')),
      mediaIds: [],
      externalRefs: { gedcomId },
      createdAt: now(),
      updatedAt: now(),
    };
  }

  const famNodes = (parsed.children ?? []).filter((n) => n.type === 'FAM');
  for (const fam of famNodes) {
    const gedcomId = fam.data?.xref_id ?? '';
    const id = famXrefToId(gedcomId);

    const husbNode = getChild(fam, 'HUSB');
    const wifeNode = getChild(fam, 'WIFE');
    const childNodes = getChildren(fam, 'CHIL');

    const partners: Family['partners'] = [];
    if (husbNode?.data?.pointer ?? husbNode?.value) {
      const pid = xrefToId(husbNode!.data?.pointer ?? husbNode!.value);
      if (persons[pid]) partners.push({ personId: pid, role: 'partner1' });
    }
    if (wifeNode?.data?.pointer ?? wifeNode?.value) {
      const pid = xrefToId(wifeNode!.data?.pointer ?? wifeNode!.value);
      if (persons[pid]) partners.push({ personId: pid, role: 'partner2' });
    }

    const children: Family['children'] = childNodes
      .map((c) => {
        const pid = xrefToId(c.data?.pointer ?? c.value ?? '');
        if (!persons[pid]) return null;
        const child: Family['children'][number] = { personId: pid, relationship: 'biological' };
        return child;
      })
      .filter((c): c is Family['children'][number] => c !== null);

    const marrNode = getChild(fam, 'MARR');

    families[id] = {
      id,
      type: marrNode ? 'marriage' : 'unknown',
      partners,
      union: parseEvent(marrNode),
      children,
      gedcomId,
      createdAt: now(),
      updatedAt: now(),
    };
  }

  return {
    data: {
      meta: {
        version: '1.0',
        title: { en: 'Imported Tree', es: 'Árbol Importado' },
        createdAt: now(),
        updatedAt: now(),
        exportedFrom: 'gedcom',
      },
      persons,
      families,
      media: {},
    },
    errors,
  };
}

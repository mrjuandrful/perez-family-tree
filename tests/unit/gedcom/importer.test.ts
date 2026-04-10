import { describe, it, expect } from 'vitest';
import { importGedcom } from '../../../src/lib/gedcom/importer';

const SIMPLE_GEDCOM = `0 HEAD
1 SOUR Test
0 @I1@ INDI
1 NAME Juan /Perez/
1 GIVN Juan
1 SURN Perez
1 SEX M
1 BIRT
2 DATE 15 MAR 1945
2 PLAC Guadalajara, Mexico
0 @I2@ INDI
1 NAME Maria /Gonzalez/
1 SEX F
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
0 TRLR`;

describe('importGedcom', () => {
  it('parses persons correctly', () => {
    const { data, errors } = importGedcom(SIMPLE_GEDCOM);
    expect(errors).toHaveLength(0);
    const persons = Object.values(data.persons);
    expect(persons).toHaveLength(2);
  });

  it('parses families correctly', () => {
    const { data } = importGedcom(SIMPLE_GEDCOM);
    const families = Object.values(data.families);
    expect(families).toHaveLength(1);
    expect(families[0].partners).toHaveLength(2);
  });

  it('parses birth dates', () => {
    const { data } = importGedcom(SIMPLE_GEDCOM);
    const juan = Object.values(data.persons).find((p) => p.names.given.en === 'Juan');
    expect(juan).toBeDefined();
    expect(juan?.birth?.date?.year).toBe(1945);
    expect(juan?.birth?.date?.month).toBe(3);
    expect(juan?.birth?.date?.day).toBe(15);
  });

  it('handles empty GEDCOM gracefully', () => {
    const { data, errors } = importGedcom('0 HEAD\n0 TRLR');
    expect(Object.keys(data.persons)).toHaveLength(0);
    expect(Object.keys(data.families)).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});

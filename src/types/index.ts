export interface BilingualString {
  en: string;
  es: string;
}

export interface FuzzyDate {
  year?: number;
  month?: number;
  day?: number;
  circa?: boolean;
  before?: boolean;
  after?: boolean;
  raw?: string;
}

export interface PlaceRef {
  display: BilingualString;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  coordinates?: { lat: number; lng: number };
}

export interface LifeEvent {
  date?: FuzzyDate;
  place?: PlaceRef;
  notes?: BilingualString;
  mediaIds?: string[];
}

export interface Person {
  id: string;
  names: {
    given: BilingualString;
    surname: BilingualString;
    suffix?: string;
    nickname?: BilingualString;
    preferredDisplay?: 'given' | 'full';
  };
  gender?: 'male' | 'female' | 'nonbinary' | 'unknown';
  birth?: LifeEvent;
  death?: LifeEvent;
  burial?: LifeEvent;
  living?: boolean;
  bio?: BilingualString;
  notes?: BilingualString;
  mediaIds: string[];
  profilePhotoId?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    location?: PlaceRef;
  };
  tags?: string[];
  externalRefs?: {
    ancestry?: string;
    findagrave?: string;
    gedcomId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FamilyPartner {
  personId: string;
  role: 'partner1' | 'partner2';
}

export interface FamilyChild {
  personId: string;
  relationship: 'biological' | 'adopted' | 'step' | 'foster' | 'unknown';
  notes?: string;
}

export interface Family {
  id: string;
  type: 'marriage' | 'partnership' | 'unknown';
  partners: FamilyPartner[];
  union?: LifeEvent;
  dissolution?: LifeEvent;
  dissolved?: boolean;
  children: FamilyChild[];
  notes?: BilingualString;
  mediaIds?: string[];
  gedcomId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  type: 'photo' | 'document' | 'audio' | 'video';
  filename: string;
  path: string;
  title?: BilingualString;
  description?: BilingualString;
  date?: FuzzyDate;
  place?: PlaceRef;
  personIds: string[];
  familyIds?: string[];
  tags?: string[];
  dimensions?: { width: number; height: number };
  createdAt: string;
  updatedAt: string;
}

export interface FamilyTreeMeta {
  version: '1.0';
  title: BilingualString;
  description?: BilingualString;
  rootPersonId?: string;
  createdAt: string;
  updatedAt: string;
  exportedFrom?: string;
}

export interface FamilyTreeData {
  meta: FamilyTreeMeta;
  persons: Record<string, Person>;
  families: Record<string, Family>;
  media: Record<string, Media>;
}

export type Locale = 'en' | 'es';

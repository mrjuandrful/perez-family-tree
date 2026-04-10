import { z } from 'zod';

export const BilingualStringSchema = z.object({
  en: z.string(),
  es: z.string(),
});

export const FuzzyDateSchema = z.object({
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  circa: z.boolean().optional(),
  before: z.boolean().optional(),
  after: z.boolean().optional(),
  raw: z.string().optional(),
});

export const PlaceRefSchema = z.object({
  display: BilingualStringSchema,
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

export const LifeEventSchema = z.object({
  date: FuzzyDateSchema.optional(),
  place: PlaceRefSchema.optional(),
  notes: BilingualStringSchema.optional(),
  mediaIds: z.array(z.string()).optional(),
});

export const PersonSchema = z.object({
  id: z.string(),
  names: z.object({
    given: BilingualStringSchema,
    surname: BilingualStringSchema,
    suffix: z.string().optional(),
    nickname: BilingualStringSchema.optional(),
    preferredDisplay: z.enum(['given', 'full']).optional(),
  }),
  gender: z.enum(['male', 'female', 'nonbinary', 'unknown']).optional(),
  birth: LifeEventSchema.optional(),
  death: LifeEventSchema.optional(),
  burial: LifeEventSchema.optional(),
  living: z.boolean().optional(),
  bio: BilingualStringSchema.optional(),
  notes: BilingualStringSchema.optional(),
  mediaIds: z.array(z.string()),
  profilePhotoId: z.string().optional(),
  contactInfo: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    location: PlaceRefSchema.optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  externalRefs: z.object({
    ancestry: z.string().optional(),
    findagrave: z.string().optional(),
    gedcomId: z.string().optional(),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const FamilySchema = z.object({
  id: z.string(),
  type: z.enum(['marriage', 'partnership', 'unknown']),
  partners: z.array(z.object({
    personId: z.string(),
    role: z.enum(['partner1', 'partner2']),
  })),
  union: LifeEventSchema.optional(),
  dissolution: LifeEventSchema.optional(),
  dissolved: z.boolean().optional(),
  children: z.array(z.object({
    personId: z.string(),
    relationship: z.enum(['biological', 'adopted', 'step', 'foster', 'unknown']),
    notes: z.string().optional(),
  })),
  notes: BilingualStringSchema.optional(),
  mediaIds: z.array(z.string()).optional(),
  gedcomId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MediaSchema = z.object({
  id: z.string(),
  type: z.enum(['photo', 'document', 'audio', 'video']),
  filename: z.string(),
  path: z.string(),
  title: BilingualStringSchema.optional(),
  description: BilingualStringSchema.optional(),
  date: FuzzyDateSchema.optional(),
  place: PlaceRefSchema.optional(),
  personIds: z.array(z.string()),
  familyIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dimensions: z.object({ width: z.number(), height: z.number() }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const FamilyTreeDataSchema = z.object({
  meta: z.object({
    version: z.literal('1.0'),
    title: BilingualStringSchema,
    description: BilingualStringSchema.optional(),
    rootPersonId: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    exportedFrom: z.string().optional(),
  }),
  persons: z.record(z.string(), PersonSchema),
  families: z.record(z.string(), FamilySchema),
  media: z.record(z.string(), MediaSchema),
});

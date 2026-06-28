import { z } from 'zod';

const isoDate = z
  .string()
  .min(1, 'Date is required')
  .refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid date');

export const inmateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  otherNames: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  dateOfBirth: isoDate.refine((val) => new Date(val) < new Date(), 'Date of birth must be in the past'),
  placeOfBirth: z.string().optional().or(z.literal('')),
  nationality: z.string().optional().or(z.literal('')),
  nationalId: z.string().max(20, 'National ID must be at most 20 characters').optional().or(z.literal('')),
  maritalStatus: z.string().optional().or(z.literal('')),
  nextOfKinName: z.string().optional().or(z.literal('')),
  nextOfKinContact: z.string().optional().or(z.literal('')),
  personalBelongings: z.string().max(500, 'Personal belongings must be at most 500 characters').optional().or(z.literal('')),
  photo: z.any().refine((file) => file, 'Photo is required'),
  isYoungOffender: z.boolean().optional()
});

export const admissionSchema = z
  .object({
    admissionDate: isoDate,
    admissionType: z.enum(['first_time', 'repeat']),
    inmateType: z.enum(['convict', 'remandee', 'murder_remandee']),
    caseNumber: z.string().min(1, 'Case number is required').max(5, 'Case number must be at most 5 characters'),
    courtName: z.string().max(100, 'Court name must be at most 100 characters').optional().or(z.literal('')),
    offenceDescription: z.string().optional().or(z.literal('')),

    sentenceYears: z.any().optional(),
    sentenceMonths: z.any().optional(),
    sentenceDays: z.any().optional(),
    sentenceStartDate: z.string().optional().or(z.literal('')),

    remandNextCourtDate: z.string().optional().or(z.literal('')),
    remandDurationDays: z.any().optional(),

    activityId: z.string().optional().or(z.literal(''))
  })
  .superRefine((data, ctx) => {
    if (data.inmateType === 'convict') {
      const years = data.sentenceYears;
      if (years === '' || years == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Sentence years is required for convicts', path: ['sentenceYears'] });
      } else {
        const n = typeof years === 'number' ? years : Number(String(years));
        if (!Number.isFinite(n) || n < 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Sentence years must be a valid number', path: ['sentenceYears'] });
        }
      }

      if (!data.sentenceStartDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Sentence start date is required for convicts', path: ['sentenceStartDate'] });
      } else if (Number.isNaN(Date.parse(data.sentenceStartDate))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date', path: ['sentenceStartDate'] });
      }
    } else {
      if (!data.remandNextCourtDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Next court date is required for remandees', path: ['remandNextCourtDate'] });
      } else if (Number.isNaN(Date.parse(data.remandNextCourtDate))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date', path: ['remandNextCourtDate'] });
      } else if (!Number.isNaN(Date.parse(data.admissionDate)) && new Date(data.remandNextCourtDate) <= new Date(data.admissionDate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Next court date must be after admission date', path: ['remandNextCourtDate'] });
      }
    }
  });

export const documentsSchema = z.object({
  warrant: z.any().optional(),
  warrantDescription: z.string().optional().or(z.literal(''))
});

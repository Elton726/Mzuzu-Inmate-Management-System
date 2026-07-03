import { z } from 'zod';

const eligibilityCriteriaSchema = z.object({
  allowed_inmate_types: z.array(z.literal('convict')).optional(),
  min_sentence_years: z.number().min(0).optional(),
  min_remaining_years: z.number().min(0).optional(),
  max_remaining_years: z.number().min(0).optional(),
  skills_required: z.array(z.string().min(1)).optional(),
}).partial().refine((criteria) => {
  const min = Number(criteria.min_remaining_years ?? 0);
  const max = Number(criteria.max_remaining_years ?? 0);
  return max === 0 || max >= min;
}, {
  path: ['max_remaining_years'],
  message: 'Maximum must be greater than or equal to Minimum.',
});

export const baseActivitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category_id: z.number({ required_error: 'Select a category' }).int().positive('Select a category'),
  eligibility_criteria: eligibilityCriteriaSchema.optional(),
  max_participants: z.number().int().positive().nullable().optional(),
  security_level: z.enum(['low', 'medium', 'high']).default('medium').optional(),
});

export const externalDetailsSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  external_partner: z.string().nullable().optional(),
  requires_transport: z.boolean().default(false).optional(),
  transport_details: z.string().nullable().optional(),
  safety_requirements: z.string().nullable().optional(),
  supervisor_requirements: z.string().nullable().optional(),
});

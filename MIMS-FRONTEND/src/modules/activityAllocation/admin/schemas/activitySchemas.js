import { z } from 'zod';

const eligibilityCriteriaSchema = z.object({
  allowed_inmate_types: z.array(z.literal('convict')).optional(),
  min_sentence_years: z.number().min(0).optional(),
  skills_required: z.array(z.string().min(1)).optional(),
  good_behavior: z.boolean().optional(),
  education_level: z.enum(['none', 'primary', 'secondary', 'tertiary']).optional(),
}).partial();

export const baseActivitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category_id: z.number({ required_error: 'Select a category' }).int().positive('Select a category'),
  eligibility_criteria: eligibilityCriteriaSchema.optional(),
  max_participants: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().default(true),
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

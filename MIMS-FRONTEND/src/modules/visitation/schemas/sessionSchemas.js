import { z } from 'zod';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

export const visitationSessionSchema = z.object({
  inmate_id: z.string().min(1, 'Select an inmate'),
  visitor_id: z.string().min(1, 'Select a visitor'),
  admission_id: z.string().min(1, 'Current admission is required'),
  visit_date: z.string().regex(datePattern, 'Choose a valid date'),
  visit_time: z.string().regex(timePattern, 'Choose a valid time'),
  duration_minutes: z.number({ invalid_type_error: 'Duration must be a number' }).min(1, 'Duration must be at least 1 minute'),
  location: z.string().trim().min(2, 'Location is required'),
  visit_purpose: z.string().trim().min(2, 'Purpose is required'),
  notes: z.string().trim().optional(),
  is_charity_visit: z.boolean().optional().default(false),
  charity_organization: z.string().trim().optional(),
  charity_purpose: z.string().trim().optional()
}).superRefine((data, ctx) => {
  if (data.is_charity_visit) {
    if (!data.charity_organization) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['charity_organization'], message: 'Charity organization is required for charity visits' });
    }
    if (!data.charity_purpose) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['charity_purpose'], message: 'Charity purpose is required for charity visits' });
    }
  }
});

export const charityBookingSchema = z.object({
  organization_name: z.string().trim().min(2, 'Organization name is required'),
  contact_person: z.string().trim().min(2, 'Contact person is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid phone number'),
  purpose_of_visit: z.string().trim().min(5, 'Purpose is required'),
  preferred_date: z.string().regex(datePattern, 'Choose a valid date'),
  number_of_representatives: z.number({ invalid_type_error: 'Number is required' }).min(1, 'At least one representative is required')
});

import { z } from 'zod';

const optionalEmail = z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().email('Enter a valid email address').optional());

export const visitorRegistrationSchema = z.object({
  first_name: z.string().trim().min(2, 'First name is required'),
  last_name: z.string().trim().min(2, 'Last name is required'),
  relationship: z.enum(['family', 'friend', 'legal_representative', 'social_worker', 'charity_representative', 'other'], 'Choose a relationship'),
  contact_number: z.string().trim().min(7, 'Contact number is required').regex(/^\+?[0-9\s-]{7,20}$/, 'Please enter a valid phone number'),
  national_id: z.string().trim().optional(),
  email: optionalEmail
});

export const visitorUpdateSchema = visitorRegistrationSchema;

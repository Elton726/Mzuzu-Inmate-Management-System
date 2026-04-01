import { z } from 'zod';

export const assignOfficerSchema = z.object({
  officer_id: z.number().positive('Select an officer'),
  duty_week_start: z.string().min(1, 'Select a week start date'),
});

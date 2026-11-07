/** Zod schemas for every API input. */
import { z } from 'zod';
import mongoose from 'mongoose';
import { isValidDayKey, isValidTimeZone } from '../utils/date.js';

const email = z.string().trim().toLowerCase().email('Enter a valid email').max(254);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');
const name = z.string().trim().min(1, 'Name is required').max(60, 'Name is too long');
const timezone = z.string().refine(isValidTimeZone, 'Unknown timezone');
const dayKey = z.string().refine(isValidDayKey, 'Dates must be in YYYY-MM-DD format');

export const registerBody = z.object({
  name,
  email,
  password,
  timezone: timezone.optional(),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

export const updateMeBody = z
  .object({ name: name.optional(), timezone: timezone.optional() })
  .refine((v) => v.name !== undefined || v.timezone !== undefined, 'Nothing to update');

export const counterIdParams = z.object({
  id: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid counter id'),
});

export const counterBody = z.object({
  name: z.string().trim().min(1, 'Label is required').max(50, 'Label is too long (max 50)'),
});

export const incrementBody = z.object({
  amount: z.union([z.literal(1), z.literal(-1)], {
    errorMap: () => ({ message: 'amount must be 1 or -1' }),
  }),
});

export const historyQuery = z
  .object({ from: dayKey.optional(), to: dayKey.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, '`from` must be on or before `to`');

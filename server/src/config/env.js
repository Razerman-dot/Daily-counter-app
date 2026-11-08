/**
 * Centralised, validated environment configuration.
 *
 * Everything the app reads from process.env goes through here so that a
 * misconfigured deployment fails fast at boot instead of at the first request.
 */
import 'dotenv/config';
import { z } from 'zod';

const boolish = z
  .enum(['true', 'false', ''])
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v === 'true'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none', '']).optional(),
  COOKIE_SECURE: boolish,
  DEFAULT_TIMEZONE: z.string().default('Africa/Lagos'),
  // Number of reverse proxies in front of the app (Render = 1; Vercel rewrite + Render = 2).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
});

// Tests run without a .env file, so give them safe defaults.
if (process.env.NODE_ENV === 'test') {
  process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-1234';
}

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const raw = parsed.data;
const isProd = raw.NODE_ENV === 'production';

export const env = {
  ...raw,
  isProd,
  isTest: raw.NODE_ENV === 'test',
  clientOrigins: raw.CLIENT_ORIGIN.split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
  cookie: {
    sameSite: raw.COOKIE_SAMESITE || (isProd ? 'none' : 'lax'),
    // SameSite=None cookies are rejected by browsers unless Secure is set.
    secure: raw.COOKIE_SECURE ?? (isProd || raw.COOKIE_SAMESITE === 'none'),
  },
};

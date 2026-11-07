import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

/**
 * Brute-force protection for login/register: 20 attempts / 15 min / IP.
 * Successful requests don't count, so a normal user is never locked out.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

/** Generous global limit to blunt abuse without bothering fast tappers. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.isTest ? 100_000 : 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down a little.' },
});

/**
 * CSRF defence for cookie-authenticated, state-changing requests.
 *
 * Browsers cannot send a custom header cross-origin without a CORS preflight,
 * and our CORS policy only approves the configured frontend origin. So
 * requiring `X-Requested-With` on every non-GET request means a malicious
 * site can't forge one, even when the cookie is SameSite=None.
 */
export function requireAjaxHeader(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') === 'XMLHttpRequest') return next();
  next(new HttpError(403, 'Missing X-Requested-With header'));
}

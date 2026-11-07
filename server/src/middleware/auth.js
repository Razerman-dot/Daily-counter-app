import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { HttpError, asyncHandler } from '../utils/http.js';

export const AUTH_COOKIE = 'dc_token';

/** Cookie options shared by set + clear (they must match for clear to work). */
function cookieOptions() {
  return {
    httpOnly: true, // not readable from JS -> safe from XSS token theft
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/',
  };
}

/** Parse "7d" / "12h" / "30m" / seconds into milliseconds for the cookie maxAge. */
function expiresInMs(value) {
  const m = /^(\d+)\s*([smhd]?)$/.exec(String(value).trim());
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = Number(m[1]);
  const unit = { '': 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
  return n * unit * 1000;
}

/** Issue a signed JWT for the user and set it as an httpOnly cookie. */
export function setAuthCookie(res, userId) {
  const token = jwt.sign({ sub: userId.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: expiresInMs(env.JWT_EXPIRES_IN) });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}

/**
 * Require a valid session. On success attaches the full user document as
 * `req.user`. Anything else -> 401.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw new HttpError(401, 'Not authenticated');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Session expired, please log in again');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Account no longer exists');

  req.user = user;
  next();
});

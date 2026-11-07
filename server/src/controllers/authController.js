import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Counter } from '../models/Counter.js';
import { clearAuthCookie, setAuthCookie } from '../middleware/auth.js';
import { HttpError } from '../utils/http.js';
import { DEFAULT_TIMEZONE } from '../utils/date.js';

// Used to burn the same bcrypt time when an email doesn't exist, so response
// timing doesn't reveal which emails are registered.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash('not-a-real-password', 12));

/** POST /api/auth/register */
export async function register(req, res) {
  const { name, email, password, timezone } = req.valid.body;

  if (await User.exists({ email })) {
    throw new HttpError(409, 'An account with that email already exists');
  }

  const user = new User({ name, email, timezone: timezone || DEFAULT_TIMEZONE });
  await user.setPassword(password);
  await user.save();

  // Give every new user a counter so the main screen works immediately.
  await Counter.create({ userId: user._id, name: 'My counter' });

  setAuthCookie(res, user._id);
  res.status(201).json({ user: user.toPublic() });
}

/** POST /api/auth/login */
export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    await bcrypt.compare(password, await getDummyHash());
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (!(await user.verifyPassword(password))) {
    throw new HttpError(401, 'Incorrect email or password');
  }

  setAuthCookie(res, user._id);
  res.json({ user: user.toPublic() });
}

/** POST /api/auth/logout */
export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

/** GET /api/auth/me */
export function me(req, res) {
  res.json({ user: req.user.toPublic() });
}

/** PATCH /api/auth/me – update display name and/or timezone. */
export async function updateMe(req, res) {
  const { name, timezone } = req.valid.body;
  if (name !== undefined) req.user.name = name;
  if (timezone !== undefined) req.user.timezone = timezone;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}

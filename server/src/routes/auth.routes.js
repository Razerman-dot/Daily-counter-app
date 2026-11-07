import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';
import { loginBody, registerBody, updateMeBody } from '../validators/schemas.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerBody }), asyncHandler(auth.register));
router.post('/login', authLimiter, validate({ body: loginBody }), asyncHandler(auth.login));
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);
router.patch('/me', requireAuth, validate({ body: updateMeBody }), asyncHandler(auth.updateMe));

export default router;

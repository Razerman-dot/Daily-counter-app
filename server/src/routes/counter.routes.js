import { Router } from 'express';
import * as c from '../controllers/counterController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';
import { counterBody, counterIdParams, historyQuery, incrementBody } from '../validators/schemas.js';

const router = Router();

// Every counter route requires a logged-in user.
router.use(requireAuth);

router.get('/', asyncHandler(c.listCounters));
router.post('/', validate({ body: counterBody }), asyncHandler(c.createCounter));

// Routes below operate on one counter, which must belong to req.user.
const own = [validate({ params: counterIdParams }), c.loadCounter];

router.patch('/:id', own, validate({ body: counterBody }), asyncHandler(c.renameCounter));
router.delete('/:id', own, asyncHandler(c.deleteCounter));

router.get('/:id/today', own, asyncHandler(c.getToday));
router.post('/:id/increment', own, validate({ body: incrementBody }), asyncHandler(c.increment));
router.post('/:id/reset-today', own, asyncHandler(c.resetToday));

router.get('/:id/history', own, validate({ query: historyQuery }), asyncHandler(c.history));
router.get('/:id/stats', own, asyncHandler(c.stats));
router.get('/:id/export.csv', own, validate({ query: historyQuery }), asyncHandler(c.exportCsv));

export default router;

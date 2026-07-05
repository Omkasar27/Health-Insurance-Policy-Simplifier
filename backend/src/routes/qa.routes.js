import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { ask, listConversations, getConversation } from '../controllers/qa.controller.js';

const router = Router();
router.use(requireAuth);
router.post('/questions', ask);
router.get('/conversations', listConversations);
router.get('/conversations/:id', getConversation);

export default router;
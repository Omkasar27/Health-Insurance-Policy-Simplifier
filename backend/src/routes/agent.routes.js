import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { testPlanner } from '../controllers/agent.controller.js';
import { testRetrievalAgent } from '../controllers/agent.controller.js';
import { testCoverageAgent } from '../controllers/agent.controller.js';
import { testCitationAgent } from '../controllers/agent.controller.js';
import { testVerificationAgent } from '../controllers/agent.controller.js';

const router = Router();
router.use(requireAuth);
router.post('/test-planner', testPlanner);
router.post('/test-retrieval-agent', testRetrievalAgent);
router.post('/test-coverage-agent', testCoverageAgent);
router.post('/test-citation-agent', testCitationAgent);
router.post('/test-verification-agent', testVerificationAgent);

export default router;
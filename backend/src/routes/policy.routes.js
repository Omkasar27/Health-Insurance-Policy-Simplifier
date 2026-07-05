import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadPolicy } from '../middleware/upload.middleware.js';
import { uploadPolicies, listPolicies, getPolicy } from '../controllers/policy.controller.js';
import { embedPolicyHandler, testRetrieval } from '../controllers/policy.controller.js';
import { deletePolicy } from '../controllers/policy.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/', uploadPolicy.array('files', 5), uploadPolicies);
router.get('/', listPolicies);
router.get('/:id', getPolicy);
router.post('/:id/embed', embedPolicyHandler);
router.post('/test-retrieval', testRetrieval);
router.delete('/:id', deletePolicy);
export default router;
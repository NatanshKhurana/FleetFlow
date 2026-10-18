import { Router } from 'express';
import { createAgent } from '../controllers/agentController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createAgentSchema } from '../validation/agentSchemas.js';

const router = Router();

router.post('/', validateRequest(createAgentSchema), createAgent);

export default router;

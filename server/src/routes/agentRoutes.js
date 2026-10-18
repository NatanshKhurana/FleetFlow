import { Router } from 'express';
import { createAgent, listAgents } from '../controllers/agentController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createAgentSchema, listAgentsSchema } from '../validation/agentSchemas.js';

const router = Router();

router.post('/', validateRequest(createAgentSchema), createAgent);
router.get('/', validateRequest(listAgentsSchema, 'query'), listAgents);

export default router;

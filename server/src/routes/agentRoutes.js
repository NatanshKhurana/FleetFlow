import { Router } from 'express';
import { createAgent, getAgentById, listAgents } from '../controllers/agentController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { agentParamsSchema, createAgentSchema, listAgentsSchema } from '../validation/agentSchemas.js';

const router = Router();

router.post('/', validateRequest(createAgentSchema), createAgent);
router.get('/', validateRequest(listAgentsSchema, 'query'), listAgents);
router.get('/:id', validateRequest(agentParamsSchema, 'params'), getAgentById);

export default router;

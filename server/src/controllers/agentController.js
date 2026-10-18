import Agent from '../models/Agent.js';
import { ApiError } from '../utils/ApiError.js';

export async function createAgent(request, response, next) {
  try {
    // Wait for the unique index before writing, including the first request.
    await Agent.init();
    const agent = await Agent.create(request.validated.body);

    // Explicitly select public fields instead of serializing database metadata.
    return response.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: {
        id: agent._id.toString(),
        agentId: agent.agentId,
        fullName: agent.fullName,
        phone: agent.phone,
        email: agent.email,
        serviceArea: agent.serviceArea,
        status: agent.status,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, 'An agent with this agentId already exists'));
    }
    return next(error);
  }
}

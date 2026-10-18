import Agent from '../models/Agent.js';
import { ApiError } from '../utils/ApiError.js';

function publicAgent(agent) {
  // All agent endpoints expose the same fields, without Mongoose internals.
  return {
    id: agent._id.toString(),
    agentId: agent.agentId,
    fullName: agent.fullName,
    phone: agent.phone,
    email: agent.email,
    serviceArea: agent.serviceArea,
    status: agent.status,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

export async function createAgent(request, response, next) {
  try {
    // Wait for the unique index before writing, including the first request.
    await Agent.init();
    const agent = await Agent.create(request.validated.body);

    // Explicitly select public fields instead of serializing database metadata.
    return response.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: publicAgent(agent),
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, 'An agent with this agentId already exists'));
    }
    return next(error);
  }
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listAgents(request, response, next) {
  try {
    const { page, limit, search, status, serviceArea } = request.validated.query;
    const filter = {};
    if (status) filter.status = status;
    if (serviceArea) filter.serviceArea = serviceArea;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      // MongoDB combines these OR search fields with the filters above using AND.
      filter.$or = ['agentId', 'fullName', 'phone', 'email', 'serviceArea']
        .map((field) => ({ [field]: pattern }));
    }

    const skip = (page - 1) * limit;
    const [agents, total] = await Promise.all([
      Agent.find(filter)
        .select('agentId fullName phone email serviceArea status createdAt updatedAt')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Agent.countDocuments(filter).exec(),
    ]);

    return response.status(200).json({
      success: true,
      message: 'Agents retrieved successfully',
      data: agents.map(publicAgent),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAgentById(request, response, next) {
  try {
    const agent = await Agent.findById(request.validated.params.id)
      .select('agentId fullName phone email serviceArea status createdAt updatedAt')
      .lean()
      .exec();

    if (!agent) {
      return next(new ApiError(404, 'Agent not found'));
    }

    return response.status(200).json({
      success: true,
      message: 'Agent retrieved successfully',
      data: publicAgent(agent),
    });
  } catch (error) {
    return next(error);
  }
}

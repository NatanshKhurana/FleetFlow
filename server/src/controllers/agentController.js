import Agent from '../models/Agent.js';
import { ApiError } from '../utils/ApiError.js';
import { agentListCache } from '../services/agentListCache.js';
import { agentDetailCache } from '../services/agentDetailCache.js';
import { agentCacheState } from '../services/agentCacheState.js';

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
    await agentCacheState.invalidate(agent._id.toString());

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
    const { response: cached, generation } = await agentListCache.read(request.validated.query);
    if (cached) return response.status(200).json(cached);

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

    const result = {
      success: true,
      message: 'Agents retrieved successfully',
      data: agents.map(publicAgent),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    await agentListCache.write(request.validated.query, result, request.app.locals.agentListCacheTtlSeconds, generation);
    return response.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getAgentById(request, response, next) {
  try {
    const id = request.validated.params.id;
    const { response: cached, generation } = await agentDetailCache.read(id);
    if (cached) return response.status(200).json(cached);

    const agent = await Agent.findById(id)
      .select('agentId fullName phone email serviceArea status createdAt updatedAt')
      .lean()
      .exec();

    if (!agent) {
      return next(new ApiError(404, 'Agent not found'));
    }

    const result = {
      success: true,
      message: 'Agent retrieved successfully',
      data: publicAgent(agent),
    };
    // Reuse the list TTL setting; only a successfully found agent reaches this write.
    await agentDetailCache.write(id, result, request.app.locals.agentListCacheTtlSeconds, generation);
    return response.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateAgent(request, response, next) {
  try {
    // $set changes only supplied fields; Mongoose manages updatedAt itself.
    const agent = await Agent.findByIdAndUpdate(
      request.validated.params.id,
      { $set: request.validated.body },
      { returnDocument: 'after', runValidators: true, upsert: false },
    )
      .select('agentId fullName phone email serviceArea status createdAt updatedAt')
      .lean()
      .exec();

    if (!agent) {
      return next(new ApiError(404, 'Agent not found'));
    }

    await agentCacheState.invalidate(agent._id.toString());
    return response.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      data: publicAgent(agent),
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, 'Agent update conflicts with an existing record'));
    }
    return next(error);
  }
}

export async function deleteAgent(request, response, next) {
  try {
    // Delete one matching record and use its ID only to confirm it existed.
    const agent = await Agent.findByIdAndDelete(request.validated.params.id)
      .select('_id')
      .lean()
      .exec();

    if (!agent) {
      return next(new ApiError(404, 'Agent not found'));
    }

    // The roadmap requires 204: a successful response has no JSON body.
    await agentCacheState.invalidate(request.validated.params.id);
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
}

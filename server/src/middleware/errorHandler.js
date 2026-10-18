import { ZodError } from 'zod';
import { ApiError, RequestValidationError } from '../utils/ApiError.js';

function validationDetails(issues, section) {
  const messages = {
    invalid_type: 'Invalid or missing value',
    too_small: 'Value is too short or below the minimum',
    too_big: 'Value is too long or above the maximum',
    invalid_format: 'Invalid format',
    invalid_value: 'Value is not allowed',
    unrecognized_keys: 'Unexpected fields',
  };

  // Never copy raw messages, submitted values, or extra issue metadata.
  return issues.map((issue) => ({
    section,
    field: issue.path.map(String).join('.') || '(root)',
    message: messages[issue.code] || 'Invalid value',
  }));
}

// Express requires all four parameters and this middleware must run last.
export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error instanceof RequestValidationError || error instanceof ZodError) {
    return response.status(400).json({
      success: false,
      message: 'Request validation failed',
      details: validationDetails(error.issues, error instanceof RequestValidationError ? error.section : 'request'),
    });
  }

  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({
      success: false,
      message: 'Invalid JSON request body',
    });
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({
      success: false,
      message: 'Request body is too large',
    });
  }

  if (error instanceof ApiError && error.statusCode < 500) {
    // ApiError messages must be developer-written public text, never raw errors.
    return response.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // Neither clients nor logs receive potentially secret internal error details.
  console.error('API request failed with a server error.');
  return response.status(error instanceof ApiError ? error.statusCode : 500).json({
    success: false,
    message: 'Internal server error',
  });
}

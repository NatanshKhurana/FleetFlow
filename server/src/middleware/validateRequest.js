import { RequestValidationError } from '../utils/ApiError.js';

export function validateRequest(schema, section = 'body') {
  if (!['body', 'params', 'query'].includes(section)) {
    throw new TypeError('Request validation supports body, params, or query.');
  }

  return async (request, response, next) => {
    // Async parsing also supports schemas with asynchronous refinements.
    const result = await schema.safeParseAsync(request[section]);
    if (!result.success) {
      return next(new RequestValidationError(section, result.error.issues));
    }

    // Preserve original request sections, including Express 5's query getter.
    request.validated ??= {};
    request.validated[section] = result.data;
    next();
  };
}

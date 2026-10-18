export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
      throw new TypeError('ApiError requires an HTTP status from 400 to 599.');
    }
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export class RequestValidationError extends ApiError {
  constructor(section, issues) {
    super(400, 'Request validation failed');
    this.name = 'RequestValidationError';
    this.section = section;
    // Keep original issues internal; the error handler builds safe public details.
    this.issues = issues;
  }
}

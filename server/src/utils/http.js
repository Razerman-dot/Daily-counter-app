/** An error that maps directly to an HTTP response. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Wrap an async route handler so rejected promises reach Express's error
 * middleware (Express 4 doesn't do this on its own).
 */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

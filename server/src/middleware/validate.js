import { HttpError } from '../utils/http.js';

/**
 * Validate request parts with Zod schemas.
 * Parsed (coerced, stripped) values are placed on `req.valid.{body,params,query}`
 * so controllers only ever touch validated data.
 *
 *   router.post('/x', validate({ body: schema }), handler)
 */
export const validate =
  (schemas) =>
  (req, _res, next) => {
    req.valid = req.valid || {};
    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({
          field: i.path.join('.') || part,
          message: i.message,
        }));
        return next(new HttpError(400, details[0]?.message || 'Invalid request', details));
      }
      req.valid[part] = result.data;
    }
    next();
  };

// Parses req[source] with a zod schema and replaces it with the parsed (typed, stripped) value.
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(result.error);
  if (source === 'query') req.validQuery = result.data;
  else req[source] = result.data;
  next();
};

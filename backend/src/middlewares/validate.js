import { ApiError } from '../utils/ApiError.js';

export function validate(schema) {
  return (req, _res, next) => {
    const { value, error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return next(new ApiError(400, 'Please check the submitted fields.', error.details.map((item) => ({
        field: item.path.join('.'),
        message: item.message
      }))));
    }
    req.body = value;
    return next();
  };
}

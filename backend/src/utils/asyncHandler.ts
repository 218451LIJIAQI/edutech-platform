import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper for route handlers to consistently forward both async rejections and
 * synchronous throws to Express error middleware.
 *
 * - Accepts any Express handler (sync or async)
 * - Catches sync errors via try/catch
 * - Catches async errors via Promise rejection
 */
export const asyncHandler = <
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery, Locals>, res: Response<ResBody, Locals>, next: NextFunction) => any
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction
  ) => {
    try {
      // Wrap in Promise.resolve to handle both sync return and async functions
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (err) {
      next(err as unknown);
    }
  };
};

export default asyncHandler;

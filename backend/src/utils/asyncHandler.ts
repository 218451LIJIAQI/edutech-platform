/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

/**
 * Wrapper for route handlers to consistently forward both async rejections and
 * synchronous throws to Express error middleware.
 *
 * - Accepts any Express handler (sync or async)
 * - Catches sync errors via try/catch
 * - Catches async errors via Promise rejection
 */
export const asyncHandler = <
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>
>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery, Locals>, res: Response<ResBody, Locals>, next: NextFunction) => void | Promise<void>
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

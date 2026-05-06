import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps Express route handlers and forwards both synchronous errors
 * and asynchronous promise rejections to the centralized error middleware.
 *
 * This keeps controller code clean by avoiding repetitive try/catch blocks.
 */
type AsyncRouteHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Request["query"],
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction,
) => unknown | Promise<unknown>;

const asyncHandler = <
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Request["query"],
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  fn: AsyncRouteHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction,
  ): void => {
    void Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };
};

export default asyncHandler;

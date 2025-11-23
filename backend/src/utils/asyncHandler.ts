import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper for async route handlers to catch errors and pass to error middleware
 * @param fn - Async function to wrap
 * @returns Express middleware function
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;


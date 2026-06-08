// without this every route would need repetitive error handling
// ie: with
//   router.get("/", (req, res) => {
//     const pets = await getPets(req);
//     res.json(pets);
//   });
// what if getPets(req) throws "throw new HttpError(400, "Invalid query");"
// or db connection fails or prisma throws
// you'd need to add error handling like:
//   router.get("/", (req, res, next) => {
//     try {
//       const pets = await getPets(req);
//       res.json(pets);
//     } catch (error) {
//       next(error);
//     }
//   });
// this is error prone and repetitive
// so we use asyncRoute to wrap the route handler
// and let the error bubble up to the global error handler
// which can then send a 500 or 400 response

import type { NextFunction, Request, Response } from "express";

// basically just says a route handler is async and returns a promise
type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

// accepts async (req, res, next) => ... and returns a new function
export function asyncRoute(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    // with normal success asyncRoute(async (req, res, next) => ...)
    // flow is handler() -> promise resolves -> nothing happens
    // error case example: asyncRoute(async (req, res, next) => { throw new HttpError(400, "Invalid query"); })
    // flow is handler() -> promise rejects -> .catch(next) -> next(error) -> global error handler
    // which lands in server/index.ts -> app.use(errorHandler) -> errorHandler(error, req, res, next)
    // next(error) means skip normal middleware and go straight to error handler
    // void is for typescript/linting
    // without it handler(...) returns a promise and ts might complain about unhandled promise rejection
    // void says "I know this returns a promise I'm intentionally not waiting for it"
    void handler(req, res, next).catch(next);
  };
}


// example from code:
// router.get("/pets", asyncRoute(async (req, res) => {
//   ok(res, await getPets(req));
// }));
// without asyncRoute you'd need:
// router.get("/pets", (req, res, next) => {
//   try {
//     ok(res, await getPets(req))
//   } catch (error) {
//     next(error);
//   }
// });
// every time
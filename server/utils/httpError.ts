// creates custom application error types
// otherwise every thrown error would be 500 Internal Server Error

// contains normal error like stack trace, message, instance of Error
// plus custom statusCode and details
export class HttpError extends Error {
    statusCode: number;
    details?: unknown;
  
    constructor(statusCode: number, message: string, details?: unknown) {
      // calls parent Error constructor
      // error.message and stack trace wouldn't work without it
      super(message);
      this.statusCode = statusCode;
      this.name = "HttpError";
    }
  }

  // example usage:
  // const statusCode = 
  //   error instanceof Error && "statusCode" in error
  //   ? Number((error as { statusCode: number }).statusCode)
  //   : 500;
  // ^ checks if thrown error includes statusCode & uses it or defaults to 500

  // full flow:
  // service throws
  // asyncRoute.catch(next)
  // global error handler
  // reads statusCode and details from error
  // returns json like:
  // { error: "Invalid query", details: { query: "kevin" } }
  // or
  // { error: "Database error", details: { stack: "..." } }
  // or
  // { error: "Server error", details: null }
  // which makes it easier to handle in frontend
  // and provides a clear contract for error handling
  // ie: if (response.success) { ... } else { handleError(response.error) }
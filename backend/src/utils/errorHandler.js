import logger from './logger.js';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Error converter middleware
export const errorConverter = (err, req, res, next) => {
  let error = err;
  
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error instanceof SyntaxError ? 400 : 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  
  next(error);
};

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  const { statusCode, message, stack } = err;
  
  res.locals.errorMessage = message;
  
  const response = {
    success: false,
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: stack }),
    ...(err.errors && { errors: err.errors })
  };
  
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, {
      url: req.originalUrl,
      body: req.body,
      stack: err.stack
    });
  } else {
    logger.warn(`${statusCode} - ${message}`, {
      url: req.originalUrl
    });
  }
  
  res.status(statusCode).send(response);
};

// Handle uncaught exceptions
export const handleUncaughtErrors = () => {
  process.on('uncaughtException', (error) => {
    logger.error('UNCAUGHT EXCEPTION:', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (error) => {
    logger.error('UNHANDLED REJECTION:', error);
  });
};

export default {
  ApiError,
  errorConverter,
  errorHandler,
  handleUncaughtErrors
};
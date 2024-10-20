import STATUSCODE from "../helpers/HttpStatusCodes.js";

// Middleware to handle errors
export const sendError = (statusCode, message, next) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  next(error);
};

// Error handling middleware for Express
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

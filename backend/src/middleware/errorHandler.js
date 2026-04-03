function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: {
      message: err.message || "Internal server error",
      ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {})
    }
  });
}

module.exports = { errorHandler };

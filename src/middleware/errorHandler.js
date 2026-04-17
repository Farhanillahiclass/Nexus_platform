export function notFound(req, res, next) {
  const err = new Error(`Route not found: ${req.originalUrl}`)
  err.statusCode = 404
  next(err)
}

export function errorHandler(err, req, res, _next) {
  const status  = err.statusCode || err.status || 500
  const message = err.message || 'Internal Server Error'

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${status}] ${message}`, err.stack?.split('\n')[1] || '')
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: Object.values(err.errors).map(e => e.message).join(', ')
    })
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json({ message: `${field} already exists.` })
  }

  res.status(status).json({ message })
}

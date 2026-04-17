import rateLimit from 'express-rate-limit'

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { message: 'Too many requests. Please try again later.' },
})

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { message: 'AI rate limit reached. Please wait before sending more messages.' },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
})

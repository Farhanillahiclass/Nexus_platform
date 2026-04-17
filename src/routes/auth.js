import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'
import { protect, generateToken } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'

const router = Router()

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  next()
}

/* POST /api/auth/register */
router.post('/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body
      const exists = await User.findOne({ email })
      if (exists) return res.status(409).json({ message: 'Email already registered.' })

      const user  = await User.create({ name, email, password })
      const token = generateToken(user._id)
      res.status(201).json({ token, user: user.toPublic() })
    } catch (err) { next(err) }
  }
)

/* POST /api/auth/login */
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body
      const user = await User.findOne({ email }).select('+password')
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password.' })
      }
      user.updateStreak()
      await user.save()
      const token = generateToken(user._id)
      res.json({ token, user: user.toPublic() })
    } catch (err) { next(err) }
  }
)

/* GET /api/auth/me */
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user.toPublic() })
})

export default router

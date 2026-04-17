import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import User from '../models/User.js'
import Chat from '../models/Chat.js'

const router = Router()

/* GET /api/user/stats */
router.get('/stats', protect, async (req, res, next) => {
  try {
    const user     = req.user
    const chatCount = await Chat.countDocuments({ user: user._id })
    res.json({
      xp:      user.xp,
      streak:  user.streak,
      courses: 5,
      hours:   Math.floor(user.xp / 25),
      chats:   chatCount,
      progress: Object.fromEntries(user.progress || []),
    })
  } catch (err) { next(err) }
})

/* PATCH /api/user/progress */
router.patch('/progress', protect, async (req, res, next) => {
  try {
    const { subject, pct } = req.body
    if (!subject || pct === undefined) return res.status(400).json({ message: 'subject and pct are required' })
    const user = await User.findById(req.user._id)
    user.progress.set(subject, Math.max(0, Math.min(100, pct)))
    user.xp += 10
    await user.save()
    res.json({ progress: Object.fromEntries(user.progress), xp: user.xp })
  } catch (err) { next(err) }
})

/* PATCH /api/user/settings */
router.patch('/settings', protect, async (req, res, next) => {
  try {
    const allowed = ['theme','aiModel','notifications','learningLevel']
    const updates = {}
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[`settings.${k}`] = req.body[k] })
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true })
    res.json({ settings: user.settings })
  } catch (err) { next(err) }
})

/* POST /api/user/xp */
router.post('/xp', protect, async (req, res, next) => {
  try {
    const { amount = 5 } = req.body
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { xp: Math.min(amount, 100) } },
      { new: true }
    )
    res.json({ xp: user.xp })
  } catch (err) { next(err) }
})

export default router

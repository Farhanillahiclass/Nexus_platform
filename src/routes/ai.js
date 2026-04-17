import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { protect }   from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rateLimiter.js'
import { routeAI }   from '../services/aiService.js'
import { availableModels } from '../config/ai.js'
import Chat from '../models/Chat.js'
import User from '../models/User.js'

const router = Router()

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
  next()
}

/* POST /api/ai/chat */
router.post('/chat',
  protect,
  aiLimiter,
  [
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 8000 }),
    body('model').optional().isIn(['claude','gpt4o','gemini']),
    body('mode').optional().isIn(['chat','tutor','code','math']),
    body('level').optional().isIn(['beginner','intermediate','advanced']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { message, history = [], model = 'claude', mode = 'chat', level = 'beginner', chatId } = req.body

      const { reply, model: usedModel } = await routeAI({ model, mode, level, history, message })

      // Persist to DB (best-effort)
      try {
        let chat
        if (chatId) {
          chat = await Chat.findOne({ _id: chatId, user: req.user._id })
        }
        if (!chat) {
          chat = new Chat({ user: req.user._id, model, mode, messages: [] })
        }
        chat.messages.push({ role: 'user', content: message })
        chat.messages.push({ role: 'assistant', content: reply, model: usedModel })
        await chat.save()

        // Award XP for AI usage
        await User.findByIdAndUpdate(req.user._id, { $inc: { xp: 5 } })

        res.json({ reply, model: usedModel, chatId: chat._id })
      } catch {
        // DB save failed — still return the AI response
        res.json({ reply, model: usedModel })
      }
    } catch (err) { next(err) }
  }
)

/* GET /api/ai/history */
router.get('/history', protect, async (req, res, next) => {
  try {
    const chats = await Chat.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title model mode createdAt updatedAt')
    res.json({ chats })
  } catch (err) { next(err) }
})

/* GET /api/ai/history/:chatId */
router.get('/history/:chatId', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, user: req.user._id })
    if (!chat) return res.status(404).json({ message: 'Chat not found' })
    res.json({ chat })
  } catch (err) { next(err) }
})

/* DELETE /api/ai/history/:chatId */
router.delete('/history/:chatId', protect, async (req, res, next) => {
  try {
    await Chat.findOneAndDelete({ _id: req.params.chatId, user: req.user._id })
    res.json({ message: 'Chat deleted' })
  } catch (err) { next(err) }
})

/* GET /api/ai/models */
router.get('/models', protect, (_req, res) => {
  res.json({ available: availableModels() })
})

export default router

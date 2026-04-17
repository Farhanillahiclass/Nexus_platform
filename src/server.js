import 'dotenv/config'
import express        from 'express'
import cors           from 'cors'
import helmet         from 'helmet'
import morgan         from 'morgan'
import compression    from 'compression'
import { createServer } from 'http'
import { Server }     from 'socket.io'
import { connectDB }  from './config/db.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import authRoutes     from './routes/auth.js'
import aiRoutes       from './routes/ai.js'
import userRoutes     from './routes/user.js'
import learnRoutes    from './routes/learn.js'
import youtubeRoutes  from './routes/youtube.js'
import adminRoutes    from './routes/admin.js'
import advancedAIRoutes from './routes/advancedAI.js'
import analyticsRoutes from './routes/analytics.js'
import gamificationRoutes from './routes/gamification.js'
import paymentRoutes from './routes/payments.js'
import projectRoutes from './routes/projects.js'
import { generalLimiter } from './middleware/rateLimiter.js'
import { initializeSocket } from './services/socketService.js'

const app    = express()
const server = createServer(app)
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }
})

/* ── Connect DB ── */
connectDB()

/* ── Initialize Socket.IO ── */
initializeSocket()

/* ── Global middleware ── */
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(compression())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(generalLimiter)

/* ── Health check ── */
app.get('/health', (_req, res) => res.json({ status: 'ok', platform: 'NEXUS', version: '1.0.0', ts: new Date() }))

/* ── Routes ── */
app.use('/api/auth',  authRoutes)
app.use('/api/ai',    aiRoutes)
app.use('/api/user',  userRoutes)
app.use('/api/learn', learnRoutes)
app.use('/api/youtube', youtubeRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/advanced-ai', advancedAIRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/gamification', gamificationRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/projects', projectRoutes)

/* ── Error handling ── */
app.use(notFound)
app.use(errorHandler)

/* ── Start ── */
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`\n⚡ NEXUS Backend running on http://localhost:${PORT}`)
  console.log(`   Environment: ${process.env.NODE_ENV}`)
  console.log(`   DB: ${process.env.MONGODB_URI?.split('@')[1] || 'localhost'}`)
  console.log(`   AI: OpenAI=${!!process.env.OPENAI_API_KEY} | Anthropic=${!!process.env.ANTHROPIC_API_KEY} | Gemini=${!!process.env.GEMINI_API_KEY}\n`)
})

export { io }

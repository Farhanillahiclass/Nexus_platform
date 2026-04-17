// Simple Express Backend - No MongoDB Required!
// Uses in-memory storage for quick deployment

import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

// In-memory storage
const db = {
  users: [
    { id: 'demo-user', name: 'Guest User', email: 'guest@nexus.local', xp: 0, level: 1, streak: 1, role: 'user', createdAt: new Date().toISOString() },
    { id: 'admin-user', name: 'Admin', email: 'admin@nexus.local', xp: 1000, level: 10, streak: 30, role: 'admin', createdAt: new Date().toISOString() }
  ],
  products: [
    { id: 'p1', name: 'Islamic History Book', description: 'Complete guide to Islamic civilization', price: 29.99, category: 'books', icon: '📖', type: 'digital' },
    { id: 'p2', name: 'Python Programming', description: 'Learn Python from scratch', price: 49.99, category: 'books', icon: '🐍', type: 'digital' },
    { id: 'p3', name: 'Premium Subscription', description: 'Unlock all features', price: 9.99, category: 'premium', icon: '👑', type: 'subscription' }
  ],
  purchases: [],
  chats: [],
  messages: {},
  analytics: {
    totalUsers: 2,
    totalRevenue: 0,
    totalProducts: 3,
    totalSales: 0
  }
}

// Middleware
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())

// Simple auth middleware (mock)
const protect = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'No token' })
  
  // Find user by token (simplified)
  const userId = token.includes('admin') ? 'admin-user' : 'demo-user'
  req.user = db.users.find(u => u.id === userId)
  if (!req.user) return res.status(401).json({ message: 'Invalid token' })
  
  next()
}

// AUTH ROUTES
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body
  const user = db.users.find(u => u.email === email) || db.users[0]
  const token = `token-${user.id}-${Date.now()}`
  res.json({ user, token })
})

app.get('/api/auth/me', protect, (req, res) => {
  res.json(req.user)
})

// USER ROUTES
app.get('/api/user/stats', protect, (req, res) => {
  const userChats = db.chats.filter(c => c.userId === req.user.id).length
  res.json({
    xp: req.user.xp || 0,
    streak: req.user.streak || 1,
    courses: Math.floor((req.user.xp || 0) / 50),
    hours: Math.floor((req.user.xp || 0) / 10),
    chats: userChats,
    progress: {}
  })
})

app.patch('/api/user/progress', protect, (req, res) => {
  const { subject, pct } = req.body
  req.user.xp = (req.user.xp || 0) + 10
  res.json({ progress: { [subject]: pct }, xp: req.user.xp })
})

app.patch('/api/user/settings', protect, (req, res) => {
  Object.assign(req.user.settings || {}, req.body)
  res.json({ settings: req.user.settings || {} })
})

app.post('/api/user/xp', protect, (req, res) => {
  const { amount = 5 } = req.body
  req.user.xp = (req.user.xp || 0) + Math.min(amount, 100)
  res.json({ xp: req.user.xp })
})

// PAYMENTS ROUTES
app.get('/api/payments/products', (req, res) => {
  res.json({ products: db.products })
})

app.get('/api/payments/purchase-history', protect, (req, res) => {
  const userPurchases = db.purchases.filter(p => p.buyerId === req.user.id)
  res.json({ purchases: userPurchases })
})

app.post('/api/payments/record', protect, (req, res) => {
  const purchase = {
    id: `purch_${Date.now()}`,
    ...req.body,
    buyerId: req.user.id,
    timestamp: new Date().toISOString()
  }
  db.purchases.push(purchase)
  db.analytics.totalSales++
  db.analytics.totalRevenue += req.body.amount || 0
  res.json({ success: true, purchase })
})

// ADMIN ROUTES
app.get('/api/admin/stats', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' })
  res.json({
    totalUsers: db.users.length,
    totalRevenue: db.analytics.totalRevenue,
    totalProducts: db.products.length,
    totalSales: db.analytics.totalSales,
    newUsers: 0,
    activeUsers: db.users.length
  })
})

app.get('/api/admin/users', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' })
  res.json(db.users)
})

app.delete('/api/admin/users/:id', protect, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' })
  db.users = db.users.filter(u => u.id !== req.params.id)
  res.json({ success: true })
})

// YOUTUBE ROUTES (Mock)
const MOCK_VIDEOS = {
  education: [
    { id: 'vid1', title: 'Introduction to Calculus', channel: '3Blue1Brown', thumbnail: '📐', duration: '10:25', views: 2500000 },
    { id: 'vid2', title: 'Quantum Physics Explained', channel: 'Veritasium', thumbnail: '⚛️', duration: '15:30', views: 1800000 },
    { id: 'vid3', title: 'Learning Python in 1 Hour', channel: 'Programming with Mosh', thumbnail: '🐍', duration: '60:00', views: 3200000 },
    { id: 'vid4', title: 'Islamic Golden Age', channel: 'Kurzgesagt', thumbnail: '🕌', duration: '8:15', views: 2100000 },
  ],
  general: [
    { id: 'vid5', title: 'How to Stay Productive', channel: 'Ali Abdaal', thumbnail: '⏰', duration: '18:20', views: 1500000 },
    { id: 'vid6', title: 'The Science of Sleep', channel: 'AsapSCIENCE', thumbnail: '😴', duration: '9:45', views: 2800000 },
  ],
  technology: [
    { id: 'vid7', title: 'AI Revolution 2024', channel: 'TechLinked', thumbnail: '🤖', duration: '14:15', views: 3500000 },
    { id: 'vid8', title: 'Web Development Trends', channel: 'Fireship', thumbnail: '💻', duration: '5:30', views: 4200000 },
  ],
  science: [
    { id: 'vid9', title: 'Black Holes Explained', channel: 'PBS Space Time', thumbnail: '🌌', duration: '13:20', views: 1900000 },
    { id: 'vid10', title: 'DNA Discovery', channel: 'Crash Course', thumbnail: '🧬', duration: '11:45', views: 750000 },
  ]
}

app.get('/api/youtube/popular/:subject', (req, res) => {
  const videos = MOCK_VIDEOS[req.params.subject] || MOCK_VIDEOS.education
  res.json({ items: videos.slice(0, req.query.maxResults || 15) })
})

app.get('/api/youtube/search', (req, res) => {
  const allVideos = Object.values(MOCK_VIDEOS).flat()
  const filtered = req.query.q 
    ? allVideos.filter(v => v.title.toLowerCase().includes(req.query.q.toLowerCase()))
    : allVideos
  res.json({ items: filtered.slice(0, req.query.maxResults || 20), totalResults: filtered.length })
})

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', uptime: '100%', lastCheck: new Date().toISOString() })
})

// Root
app.get('/', (req, res) => {
  res.json({ 
    message: 'NEXUS Backend API',
    version: '1.0.0',
    endpoints: [
      '/api/auth/login',
      '/api/auth/me',
      '/api/user/stats',
      '/api/payments/products',
      '/api/youtube/popular/:subject',
      '/api/admin/stats'
    ]
  })
})

app.listen(PORT, () => {
  console.log(`🚀 NEXUS Backend running on port ${PORT}`)
  console.log(`📊 In-memory database initialized`)
})

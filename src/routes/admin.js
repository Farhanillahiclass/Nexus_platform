import express from 'express'
import User from '../models/User.js'
import { protect, admin } from '../middleware/auth.js'
import { generalLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// Apply admin protection to all routes
router.use(protect)
router.use(admin)

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    const newUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
    
    // Get user progress stats
    const users = await User.find({}, 'progress xp streak')
    const avgXP = users.reduce((sum, user) => sum + user.xp, 0) / users.length
    const avgStreak = users.reduce((sum, user) => sum + user.streak, 0) / users.length
    
    // Subject progress distribution
    const subjectProgress = {
      math: 0,
      physics: 0,
      cs: 0,
      bio: 0,
      islam: 0
    }
    
    users.forEach(user => {
      Object.entries(user.progress || {}).forEach(([subject, progress]) => {
        if (subjectProgress.hasOwnProperty(subject)) {
          subjectProgress[subject] += progress
        }
      })
    })
    
    // Average progress per subject
    Object.keys(subjectProgress).forEach(subject => {
      subjectProgress[subject] = subjectProgress[subject] / users.length
    })

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        avgXP: Math.round(avgXP),
        avgStreak: Math.round(avgStreak)
      },
      subjectProgress,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('[Admin] Stats error:', error)
    res.status(500).json({ error: 'Failed to fetch admin stats' })
  }
})

// Get all users with pagination
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const search = req.query.search || ''
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = req.query.sortOrder || 'desc'
    
    const skip = (page - 1) * limit
    
    // Build search query
    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {}
    
    // Sort options
    const sort = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1
    
    const users = await User.find(searchQuery)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
    
    const total = await User.countDocuments(searchQuery)
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('[Admin] Users error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Get user details
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password')
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json({ user })
  } catch (error) {
    console.error('[Admin] User details error:', error)
    res.status(500).json({ error: 'Failed to fetch user details' })
  }
})

// Update user
router.put('/users/:userId', async (req, res) => {
  try {
    const { name, email, xp, streak, progress, settings } = req.body
    
    const user = await User.findById(req.params.userId)
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    // Update allowed fields
    if (name) user.name = name
    if (email) user.email = email
    if (xp !== undefined) user.xp = xp
    if (streak !== undefined) user.streak = streak
    if (progress) user.progress = progress
    if (settings) user.settings = settings
    
    await user.save()
    
    res.json({ user: user.toPublic() })
  } catch (error) {
    console.error('[Admin] Update user error:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId)
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('[Admin] Delete user error:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// Get system logs (simplified version)
router.get('/logs', async (req, res) => {
  try {
    // In a real implementation, you would fetch from a logging system
    // For now, return mock data
    const logs = [
      {
        id: '1',
        level: 'info',
        message: 'User login successful',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        userId: 'user123',
        ip: '192.168.1.1'
      },
      {
        id: '2',
        level: 'warning',
        message: 'Failed login attempt',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        userId: null,
        ip: '192.168.1.2'
      },
      {
        id: '3',
        level: 'error',
        message: 'Database connection failed',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        userId: null,
        ip: 'server'
      }
    ]
    
    res.json({ logs })
  } catch (error) {
    console.error('[Admin] Logs error:', error)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// Get content management data
router.get('/content', async (req, res) => {
  try {
    // Mock content data - in real implementation, fetch from database
    const content = {
      courses: [
        {
          id: 'math_101',
          title: 'Mathematics Fundamentals',
          subject: 'math',
          lessons: 25,
          enrolled: 150,
          rating: 4.8,
          status: 'published'
        },
        {
          id: 'physics_101',
          title: 'Introduction to Physics',
          subject: 'physics',
          lessons: 30,
          enrolled: 89,
          rating: 4.6,
          status: 'published'
        }
      ],
      videos: [
        {
          id: 'video_1',
          title: 'Calculus Basics',
          youtubeId: 'abc123',
          subject: 'math',
          views: 1250,
          duration: '15:30',
          status: 'published'
        }
      ],
      playlists: [
        {
          id: 'playlist_1',
          title: 'Complete Math Course',
          videos: 45,
          totalDuration: '12:30:00',
          enrolled: 200,
          status: 'published'
        }
      ]
    }
    
    res.json(content)
  } catch (error) {
    console.error('[Admin] Content error:', error)
    res.status(500).json({ error: 'Failed to fetch content' })
  }
})

// Create/update course
router.post('/content/courses', async (req, res) => {
  try {
    const { title, subject, lessons, description, status } = req.body
    
    // In real implementation, save to database
    const course = {
      id: Date.now().toString(),
      title,
      subject,
      lessons: lessons || 0,
      description,
      enrolled: 0,
      rating: 0,
      status: status || 'draft',
      createdAt: new Date()
    }
    
    res.json({ course })
  } catch (error) {
    console.error('[Admin] Create course error:', error)
    res.status(500).json({ error: 'Failed to create course' })
  }
})

// Update course
router.put('/content/courses/:courseId', async (req, res) => {
  try {
    const { title, subject, lessons, description, status } = req.body
    
    // In real implementation, update in database
    const course = {
      id: req.params.courseId,
      title,
      subject,
      lessons,
      description,
      status,
      updatedAt: new Date()
    }
    
    res.json({ course })
  } catch (error) {
    console.error('[Admin] Update course error:', error)
    res.status(500).json({ error: 'Failed to update course' })
  }
})

// Delete course
router.delete('/content/courses/:courseId', async (req, res) => {
  try {
    // In real implementation, delete from database
    res.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('[Admin] Delete course error:', error)
    res.status(500).json({ error: 'Failed to delete course' })
  }
})

// Get system health
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'connected',
        ai: 'operational',
        youtube: 'connected',
        socketio: 'active'
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    }
    
    res.json(health)
  } catch (error) {
    console.error('[Admin] Health check error:', error)
    res.status(500).json({ error: 'Health check failed' })
  }
})

export default router

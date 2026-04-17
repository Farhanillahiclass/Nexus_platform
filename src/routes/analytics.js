import express from 'express'
import User from '../models/User.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Apply authentication to all routes
router.use(protect)

// Get user's personal analytics
router.get('/user', async (req, res) => {
  try {
    const userId = req.user.id
    
    // Get user data
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Calculate learning analytics
    const progressData = Object.entries(user.progress || {}).map(([subject, progress]) => ({
      subject,
      progress,
      name: subject.charAt(0).toUpperCase() + subject.slice(1),
      color: getSubjectColor(subject)
    }))

    // Learning streak data
    const streakData = calculateStreakData(user)
    
    // XP progression data
    const xpData = calculateXPProgression(user.xp)
    
    // Activity patterns (mock data - in production, track actual activity)
    const activityData = generateActivityData(user)

    // Learning goals
    const goalsData = generateGoalsData(progressData)

    res.json({
      user: {
        name: user.name,
        xp: user.xp,
        streak: user.streak,
        level: calculateLevel(user.xp),
        joinDate: user.createdAt
      },
      progress: progressData,
      streak: streakData,
      xp: xpData,
      activity: activityData,
      goals: goalsData,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('[Analytics] User analytics error:', error)
    res.status(500).json({ error: 'Failed to fetch user analytics' })
  }
})

// Get global analytics (admin only)
router.get('/global', async (req, res) => {
  try {
    // Check if user is admin
    const isAdmin = req.user.email === process.env.ADMIN_EMAIL || 
                   req.user.email.endsWith('@nexus.admin') ||
                   req.user.settings?.role === 'admin'
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const totalUsers = await User.countDocuments()
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    
    // Get all users for detailed analytics
    const users = await User.find({}, 'xp streak progress createdAt lastLogin')
    
    // User growth over time
    const userGrowth = calculateUserGrowth(users)
    
    // Subject popularity
    const subjectStats = calculateSubjectStats(users)
    
    // XP distribution
    const xpDistribution = calculateXPDistribution(users)
    
    // Streak distribution
    const streakDistribution = calculateStreakDistribution(users)
    
    // Engagement metrics
    const engagementMetrics = calculateEngagementMetrics(users)

    res.json({
      overview: {
        totalUsers,
        activeUsers,
        averageXP: users.reduce((sum, u) => sum + u.xp, 0) / users.length,
        averageStreak: users.reduce((sum, u) => sum + u.streak, 0) / users.length
      },
      growth: userGrowth,
      subjects: subjectStats,
      xp: xpDistribution,
      streak: streakDistribution,
      engagement: engagementMetrics,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('[Analytics] Global analytics error:', error)
    res.status(500).json({ error: 'Failed to fetch global analytics' })
  }
})

// Get learning insights
router.get('/insights', async (req, res) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Generate personalized insights
    const insights = generateLearningInsights(user)
    
    // Recommendations
    const recommendations = generateRecommendations(user)
    
    // Learning patterns
    const patterns = analyzeLearningPatterns(user)

    res.json({
      insights,
      recommendations,
      patterns,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('[Analytics] Insights error:', error)
    res.status(500).json({ error: 'Failed to generate insights' })
  }
})

// Helper functions
function getSubjectColor(subject) {
  const colors = {
    math: '#a78bfa',
    physics: '#00c8ff',
    cs: '#10b981',
    bio: '#f59e0b',
    islam: '#f59e0b'
  }
  return colors[subject] || '#6b7280'
}

function calculateStreakData(user) {
  const days = []
  const today = new Date()
  
  // Generate last 30 days of streak data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    
    // In production, check actual activity for this date
    // For now, simulate based on current streak
    const isActive = i < user.streak
    
    days.push({
      date: date.toISOString().split('T')[0],
      active: isActive,
      xp: isActive ? Math.floor(Math.random() * 50) + 10 : 0
    })
  }
  
  return days
}

function calculateXPProgression(currentXP) {
  const levels = []
  let xp = 0
  
  for (let level = 1; level <= 10; level++) {
    const requiredXP = level * 100
    const earnedXP = Math.min(currentXP - xp, requiredXP)
    
    levels.push({
      level,
      requiredXP,
      earnedXP: Math.max(0, earnedXP),
      completed: currentXP >= xp + requiredXP
    })
    
    xp += requiredXP
    if (xp > currentXP) break
  }
  
  return levels
}

function calculateLevel(xp) {
  return Math.floor(xp / 100) + 1
}

function generateActivityData(user) {
  const hours = []
  const now = new Date()
  
  // Generate last 24 hours of activity
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now)
    hour.setHours(hour.getHours() - i)
    
    // Simulate activity patterns (more active during day)
    const hourOfDay = hour.getHours()
    const isActive = hourOfDay >= 8 && hourOfDay <= 22 && Math.random() > 0.3
    
    hours.push({
      hour: hour.getHours(),
      active: isActive,
      lessons: isActive ? Math.floor(Math.random() * 3) + 1 : 0,
      videos: isActive ? Math.floor(Math.random() * 2) : 0
    })
  }
  
  return hours
}

function generateGoalsData(progressData) {
  return progressData.map(subject => ({
    subject: subject.subject,
    current: subject.progress,
    goal: 100,
    color: subject.color,
    remaining: 100 - subject.progress,
    estimatedDays: Math.ceil((100 - subject.progress) / 5) // Assume 5% per day
  }))
}

function calculateUserGrowth(users) {
  const monthly = {}
  
  users.forEach(user => {
    const month = new Date(user.createdAt).toISOString().slice(0, 7)
    monthly[month] = (monthly[month] || 0) + 1
  })
  
  // Fill missing months with 0
  const result = []
  const now = new Date()
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = date.toISOString().slice(0, 7)
    
    result.push({
      month,
      users: monthly[month] || 0,
      cumulative: result.reduce((sum, item, index) => {
        return index < result.length ? sum + item.users : sum
      }, 0) + (monthly[month] || 0)
    })
  }
  
  return result
}

function calculateSubjectStats(users) {
  const subjects = { math: 0, physics: 0, cs: 0, bio: 0, islam: 0 }
  
  users.forEach(user => {
    Object.entries(user.progress || {}).forEach(([subject, progress]) => {
      if (subjects.hasOwnProperty(subject)) {
        subjects[subject] += progress
      }
    })
  })
  
  const total = Object.values(subjects).reduce((sum, val) => sum + val, 0)
  
  return Object.entries(subjects).map(([subject, progress]) => ({
    subject,
    progress: Math.round(progress / users.length),
    percentage: total > 0 ? Math.round((progress / total) * 100) : 0,
    color: getSubjectColor(subject)
  }))
}

function calculateXPDistribution(users) {
  const ranges = [
    { label: '0-100 XP', min: 0, max: 100, count: 0 },
    { label: '101-500 XP', min: 101, max: 500, count: 0 },
    { label: '501-1000 XP', min: 501, max: 1000, count: 0 },
    { label: '1001-5000 XP', min: 1001, max: 5000, count: 0 },
    { label: '5000+ XP', min: 5001, max: Infinity, count: 0 }
  ]
  
  users.forEach(user => {
    const range = ranges.find(r => user.xp >= r.min && user.xp <= r.max)
    if (range) range.count++
  })
  
  return ranges.map(range => ({
    ...range,
    percentage: Math.round((range.count / users.length) * 100)
  }))
}

function calculateStreakDistribution(users) {
  const ranges = [
    { label: '0 days', min: 0, max: 0, count: 0 },
    { label: '1-7 days', min: 1, max: 7, count: 0 },
    { label: '8-30 days', min: 8, max: 30, count: 0 },
    { label: '31+ days', min: 31, max: Infinity, count: 0 }
  ]
  
  users.forEach(user => {
    const range = ranges.find(r => user.streak >= r.min && user.streak <= r.max)
    if (range) range.count++
  })
  
  return ranges.map(range => ({
    ...range,
    percentage: Math.round((range.count / users.length) * 100)
  }))
}

function calculateEngagementMetrics(users) {
  const activeToday = users.filter(u => {
    const lastLogin = new Date(u.lastLogin)
    const today = new Date()
    return lastLogin.toDateString() === today.toDateString()
  }).length
  
  const activeThisWeek = users.filter(u => {
    const lastLogin = new Date(u.lastLogin)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return lastLogin >= weekAgo
  }).length
  
  const powerUsers = users.filter(u => u.xp > 1000).length
  
  return {
    dailyActive: activeToday,
    weeklyActive: activeThisWeek,
    powerUsers,
    retentionRate: Math.round((activeThisWeek / users.length) * 100)
  }
}

function generateLearningInsights(user) {
  const insights = []
  
  // Progress insight
  const avgProgress = Object.values(user.progress || {}).reduce((sum, val) => sum + val, 0) / Object.keys(user.progress || {}).length
  if (avgProgress > 70) {
    insights.push({
      type: 'achievement',
      title: 'Excellent Progress!',
      description: `You're averaging ${Math.round(avgProgress)}% progress across subjects. Keep up the great work!`,
      icon: 'trophy'
    })
  }
  
  // Streak insight
  if (user.streak >= 7) {
    insights.push({
      type: 'milestone',
      title: 'Week Warrior!',
      description: `${user.streak} day streak! Consistency is key to mastery.`,
      icon: 'fire'
    })
  }
  
  // XP insight
  if (user.xp > 500) {
    insights.push({
      type: 'level',
      title: 'Rising Star',
      description: `You've earned ${user.xp} XP! You're well on your way to becoming a NEXUS expert.`,
      icon: 'star'
    })
  }
  
  return insights
}

function generateRecommendations(user) {
  const recommendations = []
  
  // Find weakest subject
  const progress = user.progress || {}
  const weakestSubject = Object.entries(progress).reduce((min, [subject, prog]) => 
    prog < min.progress ? { subject, progress: prog } : min, 
    { subject: 'general', progress: 100 }
  )
  
  if (weakestSubject.progress < 50) {
    recommendations.push({
      type: 'improvement',
      title: `Focus on ${weakestSubject.subject}`,
      description: `Your ${weakestSubject.subject} progress is at ${weakestSubject.progress}%. Try spending more time on this subject.`,
      action: 'Start Lesson',
      subject: weakestSubject.subject
    })
  }
  
  // Suggest advanced topics
  const strongSubjects = Object.entries(progress).filter(([_, prog]) => prog > 80)
  if (strongSubjects.length > 0) {
    recommendations.push({
      type: 'challenge',
      title: 'Ready for Advanced Topics?',
      description: `You're excelling in ${strongSubjects.map(([s, _]) => s).join(', ')}. Try some advanced challenges!`,
      action: 'Explore Advanced',
      subjects: strongSubjects.map(([s, _]) => s)
    })
  }
  
  return recommendations
}

function analyzeLearningPatterns(user) {
  return {
    bestTime: 'Morning (9AM - 12PM)',
    preferredSubjects: Object.keys(user.progress || {}).sort((a, b) => 
      (user.progress[b] || 0) - (user.progress[a] || 0)
    ).slice(0, 3),
    learningStyle: 'Visual Learner',
    pace: 'Steady Progress',
    consistency: user.streak > 5 ? 'High' : 'Moderate'
  }
}

export default router

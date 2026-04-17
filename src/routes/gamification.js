import express from 'express'
import User from '../models/User.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Apply authentication to all routes
router.use(protect)

// Achievement definitions
const ACHIEVEMENTS = {
  FIRST_LESSON: {
    id: 'first_lesson',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: 'firstLesson',
    xp: 50,
    type: 'milestone'
  },
  STREAK_WARRIOR: {
    id: 'streak_warrior',
    name: 'Streak Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: 'streak',
    xp: 100,
    type: 'streak'
  },
  KNOWLEDGE_SEEKER: {
    id: 'knowledge_seeker',
    name: 'Knowledge Seeker',
    description: 'Complete 50 lessons',
    icon: 'lessons',
    xp: 200,
    type: 'progress'
  },
  POLYMATH: {
    id: 'polymath',
    name: 'Polymath',
    description: 'Study 3+ different subjects',
    icon: 'polymath',
    xp: 150,
    type: 'diversity'
  },
  SPEED_LEARNER: {
    id: 'speed_learner',
    name: 'Speed Learner',
    description: 'Complete 5 lessons in one day',
    icon: 'speed',
    xp: 100,
    type: 'speed'
  },
  AI_EXPLORER: {
    id: 'ai_explorer',
    name: 'AI Explorer',
    description: 'Have 50 AI conversations',
    icon: 'ai',
    xp: 150,
    type: 'engagement'
  },
  VIDEO_MASTER: {
    id: 'video_master',
    name: 'Video Master',
    description: 'Watch 20 educational videos',
    icon: 'video',
    xp: 100,
    type: 'engagement'
  },
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Participate in 10 chat discussions',
    icon: 'social',
    xp: 75,
    type: 'social'
  },
  CODE_NINJA: {
    id: 'code_ninja',
    name: 'Code Ninja',
    description: 'Execute 100 code snippets',
    icon: 'code',
    xp: 250,
    type: 'technical'
  },
  MATH_WIZARD: {
    id: 'math_wizard',
    name: 'Math Wizard',
    description: 'Solve 25 math problems',
    icon: 'math',
    xp: 200,
    type: 'technical'
  }
}

// Get user's achievements
router.get('/achievements', async (req, res) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get user's earned achievements
    const earnedAchievements = user.achievements || []
    
    // Calculate progress for unearned achievements
    const achievementsWithProgress = Object.values(ACHIEVEMENTS).map(achievement => {
      const earned = earnedAchievements.find(a => a.id === achievement.id)
      
      if (earned) {
        return {
          ...achievement,
          earned: true,
          earnedAt: earned.earnedAt,
          progress: 100
        }
      } else {
        const progress = calculateAchievementProgress(user, achievement.id)
        return {
          ...achievement,
          earned: false,
          progress
        }
      }
    })

    res.json({
      achievements: achievementsWithProgress,
      totalEarned: earnedAchievements.length,
      totalPossible: Object.keys(ACHIEVEMENTS).length,
      completionRate: Math.round((earnedAchievements.length / Object.keys(ACHIEVEMENTS).length) * 100)
    })
  } catch (error) {
    console.error('[Gamification] Achievements error:', error)
    res.status(500).json({ error: 'Failed to fetch achievements' })
  }
})

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'xp', limit = 10 } = req.query
    
    let sortField = {}
    let projection = {}
    
    switch (type) {
      case 'xp':
        sortField = { xp: -1 }
        projection = { name: 1, xp: 1, streak: 1, level: 1 }
        break
      case 'streak':
        sortField = { streak: -1 }
        projection = { name: 1, streak: 1, xp: 1 }
        break
      case 'achievements':
        sortField = { 'achievements.length': -1 }
        projection = { name: 1, achievements: 1, xp: 1 }
        break
      default:
        sortField = { xp: -1 }
        projection = { name: 1, xp: 1, streak: 1 }
    }

    const topUsers = await User.find({}, projection)
      .sort(sortField)
      .limit(parseInt(limit))
      .lean()

    // Add rank and calculate level
    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      xp: user.xp,
      streak: user.streak,
      level: Math.floor(user.xp / 100) + 1,
      achievements: user.achievements?.length || 0
    }))

    // Get current user's rank
    const currentUserRank = await User.countDocuments({ xp: { $gt: req.user.xp } }) + 1

    res.json({
      leaderboard,
      userRank: currentUserRank,
      type,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('[Gamification] Leaderboard error:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// Get daily challenges
router.get('/daily-challenges', async (req, res) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Generate daily challenges
    const challenges = generateDailyChallenges(user)
    
    // Get user's completed challenges for today
    const today = new Date().toDateString()
    const completedToday = user.dailyChallenges?.filter(c => 
      new Date(c.completedAt).toDateString() === today
    ) || []

    const challengesWithStatus = challenges.map(challenge => {
      const completed = completedToday.find(c => c.id === challenge.id)
      return {
        ...challenge,
        completed: !!completed,
        completedAt: completed?.completedAt,
        progress: calculateChallengeProgress(user, challenge.id)
      }
    })

    res.json({
      challenges: challengesWithStatus,
      completedToday: completedToday.length,
      totalChallenges: challenges.length,
      resetIn: getTimeUntilReset()
    })
  } catch (error) {
    console.error('[Gamification] Daily challenges error:', error)
    res.status(500).json({ error: 'Failed to fetch daily challenges' })
  }
})

// Complete a challenge
router.post('/complete-challenge', async (req, res) => {
  try {
    const { challengeId } = req.body
    const userId = req.user.id
    
    if (!challengeId) {
      return res.status(400).json({ error: 'Challenge ID is required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if already completed today
    const today = new Date().toDateString()
    const alreadyCompleted = user.dailyChallenges?.some(c => 
      c.id === challengeId && new Date(c.completedAt).toDateString() === today
    )

    if (alreadyCompleted) {
      return res.status(400).json({ error: 'Challenge already completed today' })
    }

    // Find the challenge
    const challenges = generateDailyChallenges(user)
    const challenge = challenges.find(c => c.id === challengeId)
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' })
    }

    // Check if user meets requirements
    const canComplete = checkChallengeRequirements(user, challenge)
    if (!canComplete) {
      return res.status(400).json({ error: 'Challenge requirements not met' })
    }

    // Mark as completed
    if (!user.dailyChallenges) user.dailyChallenges = []
    
    user.dailyChallenges.push({
      id: challengeId,
      completedAt: new Date(),
      xp: challenge.xpReward
    })

    // Award XP
    user.xp += challenge.xpReward

    // Check for new achievements
    const newAchievements = checkAndAwardAchievements(user)

    await user.save()

    res.json({
      success: true,
      xpAwarded: challenge.xpReward,
      newAchievements,
      totalXP: user.xp
    })
  } catch (error) {
    console.error('[Gamification] Complete challenge error:', error)
    res.status(500).json({ error: 'Failed to complete challenge' })
  }
})

// Get user's stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const stats = {
      level: Math.floor(user.xp / 100) + 1,
      xp: user.xp,
      streak: user.streak,
      achievements: user.achievements?.length || 0,
      completedChallenges: user.dailyChallenges?.length || 0,
      joinDate: user.createdAt,
      lastActive: user.lastLogin,
      subjects: Object.keys(user.progress || {}).length,
      totalProgress: Object.values(user.progress || {}).reduce((sum, val) => sum + val, 0) / Math.max(Object.keys(user.progress || {}).length, 1)
    }

    res.json({ stats })
  } catch (error) {
    console.error('[Gamification] Stats error:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Helper functions
function calculateAchievementProgress(user, achievementId) {
  switch (achievementId) {
    case 'first_lesson':
      return user.progress && Object.values(user.progress).some(p => p > 0) ? 100 : 0
    
    case 'streak_warrior':
      return Math.min(100, (user.streak / 7) * 100)
    
    case 'knowledge_seeker':
      // This would require tracking lesson completions
      return Math.min(100, ((user.xp / 100) / 50) * 100)
    
    case 'polymath':
      const subjectCount = Object.keys(user.progress || {}).length
      return Math.min(100, (subjectCount / 3) * 100)
    
    case 'speed_learner':
      // This would require tracking daily lesson completions
      return 0
    
    case 'ai_explorer':
      // This would require tracking AI conversations
      return Math.min(100, ((user.xp / 100) / 50) * 100)
    
    case 'video_master':
      // This would require tracking video watches
      return 0
    
    case 'social_butterfly':
      // This would require tracking chat participation
      return 0
    
    case 'code_ninja':
      // This would require tracking code executions
      return 0
    
    case 'math_wizard':
      // This would require tracking math problems
      return 0
    
    default:
      return 0
  }
}

function generateDailyChallenges(user) {
  const baseChallenges = [
    {
      id: 'daily_lesson',
      name: 'Daily Learner',
      description: 'Complete any lesson',
      xpReward: 25,
      type: 'learning',
      requirement: { type: 'lesson', count: 1 }
    },
    {
      id: 'ai_chat',
      name: 'AI Conversation',
      description: 'Have a conversation with AI tutor',
      xpReward: 20,
      type: 'engagement',
      requirement: { type: 'ai_chat', count: 1 }
    },
    {
      id: 'streak_keeper',
      name: 'Streak Keeper',
      description: 'Maintain your learning streak',
      xpReward: 15,
      type: 'streak',
      requirement: { type: 'streak', count: 1 }
    },
    {
      id: 'subject_focus',
      name: 'Subject Focus',
      description: 'Spend 30 minutes on one subject',
      xpReward: 30,
      type: 'learning',
      requirement: { type: 'study_time', count: 1800 }
    },
    {
      id: 'social_learner',
      name: 'Social Learner',
      description: 'Participate in a study room',
      xpReward: 25,
      type: 'social',
      requirement: { type: 'social', count: 1 }
    }
  ]

  // Add personalized challenges based on user's progress
  const personalizedChallenges = []
  
  if (user.streak >= 7) {
    personalizedChallenges.push({
      id: 'streak_master',
      name: 'Streak Master',
      description: 'Keep your 7+ day streak alive',
      xpReward: 40,
      type: 'streak',
      requirement: { type: 'streak', count: 1 }
    })
  }

  return [...baseChallenges, ...personalizedChallenges].slice(0, 5)
}

function calculateChallengeProgress(user, challengeId) {
  // This would be implemented based on actual user activity tracking
  return Math.random() * 100 // Mock progress
}

function checkChallengeRequirements(user, challenge) {
  // This would check actual user activity against requirements
  return true // Mock implementation
}

function checkAndAwardAchievements(user) {
  const newAchievements = []
  const earnedAchievements = user.achievements || []

  Object.values(ACHIEVEMENTS).forEach(achievement => {
    if (!earnedAchievements.find(a => a.id === achievement.id)) {
      const progress = calculateAchievementProgress(user, achievement.id)
      
      if (progress >= 100) {
        user.achievements.push({
          id: achievement.id,
          earnedAt: new Date()
        })
        user.xp += achievement.xp
        newAchievements.push(achievement)
      }
    }
  })

  return newAchievements
}

function getTimeUntilReset() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  
  const msUntilReset = tomorrow - now
  const hours = Math.floor(msUntilReset / (1000 * 60 * 60))
  const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60))
  
  return `${hours}h ${minutes}m`
}

export default router

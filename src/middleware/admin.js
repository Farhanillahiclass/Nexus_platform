import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Admin middleware - check if user has admin privileges
export const admin = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Get user
    const user = await User.findById(decoded.id)
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' })
    }
    
    // Check if user is admin
    // You can add an admin field to the User schema or check by email
    const isAdmin = user.email === process.env.ADMIN_EMAIL || 
                   user.email.endsWith('@nexus.admin') ||
                   user.settings?.role === 'admin'
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' })
    }
    
    // Add user to request
    req.user = user
    next()
  } catch (error) {
    console.error('[Admin] Middleware error:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' })
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' })
    }
    
    res.status(500).json({ error: 'Server error in admin middleware.' })
  }
}

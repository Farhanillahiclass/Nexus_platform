import jwt  from 'jsonwebtoken'
import User from '../models/User.js'

export async function protect(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated. Please login.' })
  }
  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user    = await User.findById(decoded.id)
    if (!user) return res.status(401).json({ message: 'User not found.' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired. Please login again.' })
  }
}

export async function admin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' })
  }
  next()
}

export function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  })
}

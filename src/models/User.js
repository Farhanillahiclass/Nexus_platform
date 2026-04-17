import mongoose from 'mongoose'
import bcrypt    from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: {
    type: String, required: true, trim: true, minlength: 2, maxlength: 60,
  },
  email: {
    type: String, required: true, unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
  },
  password: {
    type: String, required: true, minlength: 6, select: false,
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  xp:        { type: Number, default: 0 },
  streak:    { type: Number, default: 0 },
  lastLogin: { type: Date,   default: Date.now },
  progress: {
    type: Map,
    of: Number,
    default: { physics: 0, math: 0, cs: 0, bio: 0, islam: 0 },
  },
  installedApps: [{ type: String }],
  settings: {
    theme:              { type: String, enum: ['dark','light'], default: 'dark' },
    aiModel:            { type: String, default: 'claude' },
    notifications:      { type: Boolean, default: true },
    learningLevel:      { type: String, enum: ['beginner','intermediate','advanced'], default: 'beginner' },
  },
}, { timestamps: true })

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare passwords
userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password)
}

// Update streak logic
userSchema.methods.updateStreak = function () {
  const now  = new Date()
  const last = new Date(this.lastLogin)
  const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24))
  if (diff === 1) this.streak += 1
  else if (diff > 1) this.streak = 1
  this.lastLogin = now
}

// Safe public JSON
userSchema.methods.toPublic = function () {
  return {
    id:       this._id,
    name:     this.name,
    email:    this.email,
    xp:       this.xp,
    streak:   this.streak,
    progress: Object.fromEntries(this.progress || []),
    settings: this.settings,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('User', userSchema)

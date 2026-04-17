import mongoose from 'mongoose'

const mindMapNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  type: { type: String, enum: ['root', 'concept', 'idea', 'note'], default: 'concept' },
  color: { type: String, default: '#00c8ff' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const mindMapConnectionSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  color: { type: String, default: '#64748b' },
  style: { type: String, enum: ['solid', 'dashed', 'dotted'], default: 'solid' }
})

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in-progress', 'review', 'completed'], default: 'todo' },
  dueDate: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  tags: [{ type: String }],
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    text: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
})

const collaboratorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['viewer', 'editor', 'admin'], default: 'viewer' },
  addedAt: { type: Date, default: Date.now },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'invite', 'manage']
  }]
})

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['general', 'study-plan', 'research-paper', 'business-plan', 'creative', 'personal'], default: 'general' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [collaboratorSchema],
  status: { type: String, enum: ['active', 'completed', 'archived', 'on-hold'], default: 'active' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  tags: [{ type: String, trim: true }],
  
  // Task management
  tasks: [taskSchema],
  
  // Mind mapping
  mindMap: {
    nodes: [mindMapNodeSchema],
    connections: [mindMapConnectionSchema],
    settings: {
      autoLayout: { type: Boolean, default: true },
      showGrid: { type: Boolean, default: false },
      nodeStyle: { type: String, enum: ['rounded', 'square', 'circle'], default: 'rounded' },
      connectionStyle: { type: String, enum: ['curved', 'straight'], default: 'curved' }
    }
  },
  
  // Project metadata
  deadline: { type: Date },
  budget: { type: Number },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  
  // Settings
  settings: {
    public: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: true },
    allowCollaboration: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    notifications: {
      taskUpdates: { type: Boolean, default: true },
      newCollaborators: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      deadlineReminders: { type: Boolean, default: true }
    }
  },
  
  // Activity log
  activity: [{
    action: { type: String, required: true },
    description: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed }
  }],
  
  // Attachments
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Comments
  comments: [{
    text: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    replies: [{
      text: String,
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now }
    }]
  }],
  
  // Templates
  template: { type: String },
  isTemplate: { type: Boolean, default: false },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for better performance
projectSchema.index({ owner: 1, status: 1 })
projectSchema.index({ 'collaborators.user': 1 })
projectSchema.index({ tags: 1 })
projectSchema.index({ type: 1 })
projectSchema.index({ createdAt: -1 })
projectSchema.index({ updatedAt: -1 })

// Virtual fields
projectSchema.virtual('taskCount').get(function() {
  return this.tasks.length
})

projectSchema.virtual('completedTaskCount').get(function() {
  return this.tasks.filter(task => task.status === 'completed').length
})

projectSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators.length
})

projectSchema.virtual('isOverdue').get(function() {
  return this.deadline && new Date(this.deadline) < new Date() && this.status !== 'completed'
})

// Methods
projectSchema.methods.addActivity = function(action, description, user, metadata = {}) {
  this.activity.push({
    action,
    description,
    user,
    metadata
  })
  this.updatedAt = new Date()
  return this.save()
}

projectSchema.methods.updateProgress = function() {
  if (this.tasks.length === 0) {
    this.progress = 0
  } else {
    const completedTasks = this.tasks.filter(task => task.status === 'completed').length
    this.progress = Math.round((completedTasks / this.tasks.length) * 100)
  }
  return this.save()
}

projectSchema.methods.addCollaborator = function(user, role = 'viewer') {
  // Check if already a collaborator
  const existingCollaborator = this.collaborators.find(
    c => c.user.toString() === user.toString()
  )
  
  if (existingCollaborator) {
    existingCollaborator.role = role
  } else {
    this.collaborators.push({ user, role })
  }
  
  return this.save()
}

projectSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    c => c.user.toString() !== userId.toString()
  )
  return this.save()
}

projectSchema.methods.addTask = function(taskData) {
  const task = {
    ...taskData,
    id: new Date().getTime().toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  this.tasks.push(task)
  this.updateProgress()
  return this.save()
}

projectSchema.methods.updateTask = function(taskId, updates) {
  const task = this.tasks.id(taskId)
  if (task) {
    Object.assign(task, updates)
    task.updatedAt = new Date()
    
    if (updates.status === 'completed' && !task.completedAt) {
      task.completedAt = new Date()
    }
    
    this.updateProgress()
  }
  return this.save()
}

projectSchema.methods.deleteTask = function(taskId) {
  this.tasks = this.tasks.filter(task => task.id !== taskId)
  this.updateProgress()
  return this.save()
}

projectSchema.methods.canUserAccess = function(userId, requiredRole = 'viewer') {
  // Owner has full access
  if (this.owner.toString() === userId.toString()) {
    return true
  }
  
  // Check collaborator role
  const collaborator = this.collaborators.find(
    c => c.user.toString() === userId.toString()
  )
  
  if (!collaborator) {
    return false
  }
  
  const roleHierarchy = { viewer: 1, editor: 2, admin: 3 }
  return roleHierarchy[collaborator.role] >= roleHierarchy[requiredRole]
}

// Static methods
projectSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    $or: [
      { owner: userId },
      { 'collaborators.user': userId }
    ]
  }
  
  if (options.status) {
    query.status = options.status
  }
  
  if (options.type) {
    query.type = options.type
  }
  
  return this.find(query).populate('collaborators.user', 'name email avatar')
}

projectSchema.statics.findTemplates = function() {
  return this.find({ isTemplate: true })
}

// Pre-save middleware
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Post-save middleware for activity logging
projectSchema.post('save', function(doc) {
  // Could trigger real-time updates here
})

const Project = mongoose.model('Project', projectSchema)

export default Project

import express from 'express'
import Project from '../models/Project.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Apply authentication to all routes
router.use(protect)

// Get user's projects
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id
    const { status, search, page = 1, limit = 10 } = req.query
    
    let query = { owner: userId }
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    }
    
    const projects = await Project.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('collaborators.user', 'name email avatar')
      .populate('tasks.assignedTo', 'name email avatar')
    
    const total = await Project.countDocuments(query)
    
    res.json({
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('[Projects] Get projects error:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const projectId = req.params.id
    const userId = req.user.id
    
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'collaborators.user': userId }
      ]
    })
    .populate('collaborators.user', 'name email avatar')
    .populate('tasks.assignedTo', 'name email avatar')
    .populate('mindMap.nodes.createdBy', 'name email avatar')
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    res.json({ project })
  } catch (error) {
    console.error('[Projects] Get project error:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// Create new project
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id
    const { name, description, type = 'general', tags = [], template } = req.body
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    
    const projectData = {
      name,
      description,
      type,
      tags,
      owner: userId,
      status: 'active',
      collaborators: [],
      tasks: [],
      mindMap: template ? applyTemplate(template) : createEmptyMindMap(),
      settings: {
        public: false,
        allowComments: true,
        allowCollaboration: true
      }
    }
    
    const project = new Project(projectData)
    await project.save()
    
    res.status(201).json({ project })
  } catch (error) {
    console.error('[Projects] Create project error:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// Update project
router.put('/:id', async (req, res) => {
  try {
    const projectId = req.params.id
    const userId = req.user.id
    const updates = req.body
    
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'collaborators.user': userId, 'collaborators.role': { $in: ['editor', 'admin'] } }
      ]
    })
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found or insufficient permissions' })
    }
    
    // Update allowed fields
    const allowedFields = ['name', 'description', 'tags', 'status', 'settings', 'deadline', 'priority']
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        project[field] = updates[field]
      }
    })
    
    project.updatedAt = new Date()
    await project.save()
    
    res.json({ project })
  } catch (error) {
    console.error('[Projects] Update project error:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const projectId = req.params.id
    const userId = req.user.id
    
    const project = await Project.findOne({
      _id: projectId,
      owner: userId
    })
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found or insufficient permissions' })
    }
    
    await Project.findByIdAndDelete(projectId)
    
    res.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('[Projects] Delete project error:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// Add collaborator
router.post('/:id/collaborators', async (req, res) => {
  try {
    const projectId = req.params.id
    const userId = req.user.id
    const { email, role = 'viewer' } = req.body
    
    const project = await Project.findOne({
      _id: projectId,
      owner: userId
    })
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found or insufficient permissions' })
    }
    
    // Find user by email
    const User = require('../models/User.js')
    const collaboratorUser = await User.findOne({ email })
    
    if (!collaboratorUser) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    // Check if already a collaborator
    const existingCollaborator = project.collaborators.find(
      c => c.user.toString() === collaboratorUser._id.toString()
    )
    
    if (existingCollaborator) {
      return res.status(400).json({ error: 'User is already a collaborator' })
    }
    
    project.collaborators.push({
      user: collaboratorUser._id,
      role,
      addedAt: new Date()
    })
    
    await project.save()
    
    res.json({ project })
  } catch (error) {
    console.error('[Projects] Add collaborator error:', error)
    res.status(500).json({ error: 'Failed to add collaborator' })
  }
})

// Remove collaborator
router.delete('/:id/collaborators/:userId', async (req, res) => {
  try {
    const projectId = req.params.id
    const userId = req.user.id
    const collaboratorId = req.params.userId
    
    const project = await Project.findOne({
      _id: projectId,
      owner: userId
    })
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found or insufficient permissions' })
    }
    
    project.collaborators = project.collaborators.filter(
      c => c.user.toString() !== collaboratorId
    )
    
    await project.save()
    
    res.json({ project })
  } catch (error) {
    console.error('[Projects] Remove collaborator error:', error)
    res.status(500).json({ error: 'Failed to remove collaborator' })
  }
})

// Add task
router.post('/:id/tasks', async (req, res) => {
  try {
    const projectId = req.params.id
    const userId = req.user.id
    const { title, description, priority = 'medium', dueDate, assignedTo } = req.body
    
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'collaborators.user': userId, 'collaborators.role': { $in: ['editor', 'admin'] } }
      ]
    })
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found or insufficient permissions' })
    }
    
    const task = {
      id: new Date().getTime().toString(),
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      status: 'todo',
      createdBy: userId,
      createdAt: new Date()
    }
    
    project.tasks.push(task)
    await project.save()
    
    res.status(201).json({ task })
  } catch (error) {
    console.error('[Projects] Add task error:', error)
    res.status(500).json({ error: 'Failed to add task' })
  }
})

// Update task
router.put('/:id/tasks/:taskId', async (req, res) => {
  try {
    const projectId = req.params.id
    const taskId = req.params.taskId
    const userId = req.user.id
    const updates = req.body
    
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'collaborators.user': userId, 'collaborators.role': { $in: ['editor', 'admin'] } }
      ]
    })
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found or insufficient permissions' })
    }
    
    const task = project.tasks.id(taskId)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    // Update allowed fields
    const allowedFields = ['title', 'description', 'priority', 'dueDate', 'assignedTo', 'status']
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        task[field] = updates[field]
      }
    })
    
    task.updatedAt = new Date()
    await project.save()
    
    res.json({ task })
  } catch (error) {
    console.error('[Projects] Update task error:', error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Delete task
router.delete('/:id/tasks/:taskId', async (req, res) => {
  try {
    const projectId = req.params.id
    const taskId = req.params.taskId
    const userId = req.user.id
    
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'collaborators.user': userId, 'collaborators.role': { $in: ['editor', 'admin'] } }
      ]
    })
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found or insufficient permissions' })
    }
    
    project.tasks = project.tasks.filter(task => task.id !== taskId)
    await project.save()
    
    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('[Projects] Delete task error:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

// Update mind map
router.put('/:id/mindmap', async (req, res) => {
  try {
    const projectId = req.params.id
    const userId = req.user.id
    const { mindMap } = req.body
    
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'collaborators.user': userId, 'collaborators.role': { $in: ['editor', 'admin'] } }
      ]
    })
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found or insufficient permissions' })
    }
    
    project.mindMap = mindMap
    project.updatedAt = new Date()
    await project.save()
    
    res.json({ project })
  } catch (error) {
    console.error('[Projects] Update mind map error:', error)
    res.status(500).json({ error: 'Failed to update mind map' })
  }
})

// Get project templates
router.get('/templates/list', async (req, res) => {
  try {
    const templates = [
      {
        id: 'study-plan',
        name: 'Study Plan',
        description: 'Organize your learning goals and milestones',
        type: 'education',
        mindMap: {
          nodes: [
            { id: 'root', text: 'Study Plan', x: 400, y: 300, type: 'root', color: '#00c8ff' },
            { id: 'goals', text: 'Learning Goals', x: 200, y: 200, type: 'concept', color: '#10b981' },
            { id: 'timeline', text: 'Timeline', x: 600, y: 200, type: 'concept', color: '#f59e0b' },
            { id: 'resources', text: 'Resources', x: 200, y: 400, type: 'concept', color: '#a78bfa' },
            { id: 'progress', text: 'Progress Tracking', x: 600, y: 400, type: 'concept', color: '#ef4444' }
          ],
          connections: [
            { from: 'root', to: 'goals' },
            { from: 'root', to: 'timeline' },
            { from: 'root', to: 'resources' },
            { from: 'root', to: 'progress' }
          ]
        }
      },
      {
        id: 'research-paper',
        name: 'Research Paper',
        description: 'Structure your research and writing process',
        type: 'academic',
        mindMap: {
          nodes: [
            { id: 'root', text: 'Research Paper', x: 400, y: 300, type: 'root', color: '#00c8ff' },
            { id: 'topic', text: 'Topic', x: 200, y: 150, type: 'concept', color: '#10b981' },
            { id: 'thesis', text: 'Thesis Statement', x: 600, y: 150, type: 'concept', color: '#f59e0b' },
            { id: 'outline', text: 'Outline', x: 200, y: 300, type: 'concept', color: '#a78bfa' },
            { id: 'sources', text: 'Sources', x: 600, y: 300, type: 'concept', color: '#ef4444' },
            { id: 'draft', text: 'Draft', x: 200, y: 450, type: 'concept', color: '#06b6d4' },
            { id: 'revision', text: 'Revision', x: 600, y: 450, type: 'concept', color: '#8b5cf6' }
          ],
          connections: [
            { from: 'root', to: 'topic' },
            { from: 'root', to: 'thesis' },
            { from: 'root', to: 'outline' },
            { from: 'root', to: 'sources' },
            { from: 'root', to: 'draft' },
            { from: 'root', to: 'revision' }
          ]
        }
      },
      {
        id: 'business-plan',
        name: 'Business Plan',
        description: 'Plan your business venture systematically',
        type: 'business',
        mindMap: {
          nodes: [
            { id: 'root', text: 'Business Plan', x: 400, y: 300, type: 'root', color: '#00c8ff' },
            { id: 'mission', text: 'Mission & Vision', x: 200, y: 150, type: 'concept', color: '#10b981' },
            { id: 'market', text: 'Market Analysis', x: 600, y: 150, type: 'concept', color: '#f59e0b' },
            { id: 'product', text: 'Product/Service', x: 200, y: 300, type: 'concept', color: '#a78bfa' },
            { id: 'strategy', text: 'Strategy', x: 600, y: 300, type: 'concept', color: '#ef4444' },
            { id: 'financial', text: 'Financial Plan', x: 200, y: 450, type: 'concept', color: '#06b6d4' },
            { id: 'team', text: 'Team', x: 600, y: 450, type: 'concept', color: '#8b5cf6' }
          ],
          connections: [
            { from: 'root', to: 'mission' },
            { from: 'root', to: 'market' },
            { from: 'root', to: 'product' },
            { from: 'root', to: 'strategy' },
            { from: 'root', to: 'financial' },
            { from: 'root', to: 'team' }
          ]
        }
      }
    ]
    
    res.json({ templates })
  } catch (error) {
    console.error('[Projects] Get templates error:', error)
    res.status(500).json({ error: 'Failed to fetch templates' })
  }
})

// Helper functions
function createEmptyMindMap() {
  return {
    nodes: [
      { id: 'root', text: 'Central Idea', x: 400, y: 300, type: 'root', color: '#00c8ff' }
    ],
    connections: []
  }
}

function applyTemplate(templateId) {
  const templates = {
    'study-plan': {
      nodes: [
        { id: 'root', text: 'Study Plan', x: 400, y: 300, type: 'root', color: '#00c8ff' },
        { id: 'goals', text: 'Learning Goals', x: 200, y: 200, type: 'concept', color: '#10b981' },
        { id: 'timeline', text: 'Timeline', x: 600, y: 200, type: 'concept', color: '#f59e0b' }
      ],
      connections: [
        { from: 'root', to: 'goals' },
        { from: 'root', to: 'timeline' }
      ]
    }
  }
  
  return templates[templateId] || createEmptyMindMap()
}

export default router

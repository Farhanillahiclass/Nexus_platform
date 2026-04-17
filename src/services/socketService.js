import { io } from '../server.js'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Store active users and rooms
const activeUsers = new Map()
const rooms = new Map()

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication error'))
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (!user) return next(new Error('User not found'))
    
    socket.user = user
    next()
  } catch (err) {
    next(new Error('Authentication error'))
  }
}

// Initialize Socket.IO service
export function initializeSocket() {
  io.use(authenticateSocket)

  io.on('connection', (socket) => {
    console.log(`[Socket] ${socket.user.name} connected (${socket.id})`)
    
    // Add user to active users
    activeUsers.set(socket.user.id, {
      id: socket.user.id,
      name: socket.user.name,
      email: socket.user.email,
      socketId: socket.id,
      status: 'online',
      lastSeen: new Date()
    })

    // Broadcast user status
    socket.broadcast.emit('user_status_change', {
      userId: socket.user.id,
      status: 'online'
    })

    // Join personal room for direct messages
    socket.join(`user_${socket.user.id}`)

    // Handle joining rooms
    socket.on('join_room', (data) => {
      const { roomId, type = 'study' } = data
      socket.join(roomId)
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          type,
          participants: new Set(),
          messages: [],
          createdAt: new Date()
        })
      }
      
      const room = rooms.get(roomId)
      room.participants.add(socket.user.id)
      
      socket.to(roomId).emit('user_joined', {
        userId: socket.user.id,
        userName: socket.user.name,
        roomId
      })
      
      socket.emit('room_joined', {
        roomId,
        participants: Array.from(room.participants),
        messages: room.messages.slice(-50) // Last 50 messages
      })
    })

    // Handle leaving rooms
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId)
      const room = rooms.get(roomId)
      if (room) {
        room.participants.delete(socket.user.id)
        socket.to(roomId).emit('user_left', {
          userId: socket.user.id,
          roomId
        })
      }
    })

    // Handle chat messages
    socket.on('send_message', async (data) => {
      const { roomId, content, type = 'text' } = data
      const room = rooms.get(roomId)
      
      if (!room) return

      const message = {
        id: Date.now().toString(),
        userId: socket.user.id,
        userName: socket.user.name,
        content,
        type,
        timestamp: new Date(),
        reactions: new Map()
      }

      room.messages.push(message)
      
      // Broadcast to room
      io.to(roomId).emit('new_message', message)
      
      // Handle AI responses in study rooms
      if (type === 'text' && room.type === 'study' && content.includes('@ai')) {
        setTimeout(() => {
          const aiResponse = {
            id: (Date.now() + 1).toString(),
            userId: 'ai',
            userName: 'NEXUS AI',
            content: generateAIResponse(content),
            type: 'text',
            timestamp: new Date(),
            reactions: new Map()
          }
          room.messages.push(aiResponse)
          io.to(roomId).emit('new_message', aiResponse)
        }, 1000)
      }
    })

    // Handle typing indicators
    socket.on('typing_start', (roomId) => {
      socket.to(roomId).emit('user_typing', {
        userId: socket.user.id,
        userName: socket.user.name,
        isTyping: true
      })
    })

    socket.on('typing_stop', (roomId) => {
      socket.to(roomId).emit('user_typing', {
        userId: socket.user.id,
        userName: socket.user.name,
        isTyping: false
      })
    })

    // Handle reactions
    socket.on('add_reaction', (data) => {
      const { roomId, messageId, emoji } = data
      const room = rooms.get(roomId)
      if (!room) return

      const message = room.messages.find(m => m.id === messageId)
      if (message) {
        if (!message.reactions.has(emoji)) {
          message.reactions.set(emoji, new Set())
        }
        message.reactions.get(emoji).add(socket.user.id)
        
        io.to(roomId).emit('reaction_added', {
          messageId,
          emoji,
          userId: socket.user.id
        })
      }
    })

    // Handle real-time collaboration (code editing, whiteboard)
    socket.on('collaboration_update', (data) => {
      const { roomId, type, payload } = data
      socket.to(roomId).emit('collaboration_update', {
        type,
        payload,
        userId: socket.user.id,
        timestamp: new Date()
      })
    })

    // Handle voice/video signaling
    socket.on('voice_call_start', (data) => {
      const { roomId, targetUserId } = data
      socket.to(`user_${targetUserId}`).emit('incoming_voice_call', {
        fromUserId: socket.user.id,
        fromUserName: socket.user.name,
        roomId
      })
    })

    socket.on('voice_call_accept', (data) => {
      const { roomId, targetUserId } = data
      socket.to(`user_${targetUserId}`).emit('voice_call_accepted', {
        userId: socket.user.id,
        roomId
      })
    })

    socket.on('voice_call_reject', (data) => {
      const { roomId, targetUserId } = data
      socket.to(`user_${targetUserId}`).emit('voice_call_rejected', {
        userId: socket.user.id,
        roomId
      })
    })

    // Handle screen sharing
    socket.on('screen_share_start', (roomId) => {
      socket.to(roomId).emit('screen_share_started', {
        userId: socket.user.id,
        streamId: `share_${socket.user.id}_${Date.now()}`
      })
    })

    socket.on('screen_share_stop', (roomId) => {
      socket.to(roomId).emit('screen_share_stopped', {
        userId: socket.user.id
      })
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket] ${socket.user.name} disconnected`)
      
      // Update user status
      const user = activeUsers.get(socket.user.id)
      if (user) {
        user.status = 'offline'
        user.lastSeen = new Date()
        
        socket.broadcast.emit('user_status_change', {
          userId: socket.user.id,
          status: 'offline',
          lastSeen: user.lastSeen
        })
        
        // Remove from active users after delay
        setTimeout(() => {
          activeUsers.delete(socket.user.id)
        }, 30000) // 30 seconds grace period
      }

      // Remove from all rooms
      rooms.forEach((room, roomId) => {
        if (room.participants.has(socket.user.id)) {
          room.participants.delete(socket.user.id)
          socket.to(roomId).emit('user_left', {
            userId: socket.user.id,
            roomId
          })
        }
      })
    })
  })
}

// Helper functions
function generateAIResponse(message) {
  const responses = [
    "That's a great question! Let me help you understand this concept better.",
    "I can see you're working on something interesting. Have you considered this approach?",
    "Here's a helpful tip: break down the problem into smaller, manageable parts.",
    "Great progress! Keep up the good work and don't hesitate to ask if you need help.",
    "Let me provide some guidance on this topic..."
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

// Get active users
export function getActiveUsers() {
  return Array.from(activeUsers.values())
}

// Get room info
export function getRoomInfo(roomId) {
  return rooms.get(roomId)
}

// Get all rooms
export function getAllRooms() {
  return Array.from(rooms.values()).map(room => ({
    ...room,
    participants: Array.from(room.participants),
    messageCount: room.messages.length
  }))
}

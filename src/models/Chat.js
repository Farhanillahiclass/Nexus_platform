import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user','assistant'], required: true },
  content: { type: String, required: true },
  model:   { type: String },
}, { _id: false })

const chatSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:    { type: String, default: 'New Conversation' },
  messages: [messageSchema],
  model:    { type: String, default: 'claude' },
  mode:     { type: String, default: 'chat' },
}, { timestamps: true })

// Auto-title from first message
chatSchema.pre('save', function (next) {
  if (this.isNew && this.messages.length > 0 && this.title === 'New Conversation') {
    this.title = this.messages[0].content.slice(0, 60)
  }
  next()
})

export default mongoose.model('Chat', chatSchema)

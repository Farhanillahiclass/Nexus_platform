import mongoose from 'mongoose'

export async function connectDB() {
  try {
    const uri  = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus_db'
    const conn = await mongoose.connect(uri)
    console.log(`✅ MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    console.error('   Make sure MongoDB is running or set MONGODB_URI in .env')
    // Don't exit — let the app run with limited functionality
  }
}

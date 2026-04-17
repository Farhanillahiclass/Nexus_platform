import express from 'express'
import advancedAIService from '../services/advancedAIService.js'
import { protect } from '../middleware/auth.js'
import multer from 'multer'
import { generalLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/pdf', 'text/markdown']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only text, PDF, and markdown files are allowed.'), false)
    }
  }
})

// Apply authentication to all routes
router.use(protect)
router.use(generalLimiter)

// Image Generation
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'realistic', size = '1024x1024', quality = 'standard' } = req.body
    
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    const result = await advancedAIService.generateImage(prompt, { style, size, quality })
    
    res.json({
      success: true,
      image: result
    })
  } catch (error) {
    console.error('[Advanced AI] Image generation error:', error)
    res.status(500).json({ error: 'Failed to generate image' })
  }
})

// Code Execution
router.post('/execute-code', async (req, res) => {
  try {
    const { code, language = 'python' } = req.body
    
    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: 'Code is required' })
    }

    const result = await advancedAIService.executeCode(code, language)
    
    res.json({
      success: true,
      execution: result
    })
  } catch (error) {
    console.error('[Advanced AI] Code execution error:', error)
    res.status(500).json({ error: error.message || 'Failed to execute code' })
  }
})

// Document Analysis
router.post('/analyze-document', async (req, res) => {
  try {
    const { text, analysisType = 'comprehensive' } = req.body
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Document text is required' })
    }

    const result = await advancedAIService.analyzeDocument(text, analysisType)
    
    res.json({
      success: true,
      analysis: result
    })
  } catch (error) {
    console.error('[Advanced AI] Document analysis error:', error)
    res.status(500).json({ error: 'Failed to analyze document' })
  }
})

// Document Analysis from File
router.post('/analyze-document-file', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { analysisType = 'comprehensive' } = req.body
    const text = req.file.buffer.toString('utf-8')
    
    const result = await advancedAIService.analyzeDocument(text, analysisType)
    
    res.json({
      success: true,
      analysis: {
        ...result,
        filename: req.file.originalname,
        fileSize: req.file.size
      }
    })
  } catch (error) {
    console.error('[Advanced AI] File analysis error:', error)
    res.status(500).json({ error: 'Failed to analyze document file' })
  }
})

// Data Visualization
router.post('/generate-visualization', async (req, res) => {
  try {
    const { data, chartType = 'auto' } = req.body
    
    if (!data) {
      return res.status(400).json({ error: 'Data is required' })
    }

    const result = await advancedAIService.generateVisualization(data, chartType)
    
    res.json({
      success: true,
      visualization: result
    })
  } catch (error) {
    console.error('[Advanced AI] Visualization error:', error)
    res.status(500).json({ error: 'Failed to generate visualization' })
  }
})

// Text-to-Speech
router.post('/generate-speech', async (req, res) => {
  try {
    const { text, voice = 'natural', speed = 1.0 } = req.body
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' })
    }

    const result = await advancedAIService.generateSpeech(text, voice, speed)
    
    res.json({
      success: true,
      speech: result
    })
  } catch (error) {
    console.error('[Advanced AI] Speech generation error:', error)
    res.status(500).json({ error: 'Failed to generate speech' })
  }
})

// Translation
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = req.body
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' })
    }

    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language is required' })
    }

    const result = await advancedAIService.translateText(text, targetLanguage, sourceLanguage)
    
    res.json({
      success: true,
      translation: result
    })
  } catch (error) {
    console.error('[Advanced AI] Translation error:', error)
    res.status(500).json({ error: 'Failed to translate text' })
  }
})

// Math Problem Solving
router.post('/solve-math', async (req, res) => {
  try {
    const { problem } = req.body
    
    if (!problem || problem.trim().length === 0) {
      return res.status(400).json({ error: 'Math problem is required' })
    }

    const result = await advancedAIService.solveMathProblem(problem)
    
    res.json({
      success: true,
      solution: result
    })
  } catch (error) {
    console.error('[Advanced AI] Math solving error:', error)
    res.status(500).json({ error: 'Failed to solve math problem' })
  }
})

// Get supported languages for translation
router.get('/supported-languages', (req, res) => {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ur', name: 'Urdu' }
  ]
  
  res.json({ languages })
})

// Get supported programming languages
router.get('/supported-languages', (req, res) => {
  const languages = [
    { code: 'python', name: 'Python', version: '3.9' },
    { code: 'javascript', name: 'JavaScript', version: 'ES2022' },
    { code: 'java', name: 'Java', version: '17' },
    { code: 'cpp', name: 'C++', version: 'C++17' },
    { code: 'c', name: 'C', version: 'C17' },
    { code: 'go', name: 'Go', version: '1.21' },
    { code: 'rust', name: 'Rust', version: '1.75' },
    { code: 'typescript', name: 'TypeScript', version: '5.0' }
  ]
  
  res.json({ languages })
})

export default router

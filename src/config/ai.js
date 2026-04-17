import Anthropic     from '@anthropic-ai/sdk'
import OpenAI        from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazy-initialize clients only if keys are present
let _anthropic, _openai, _gemini

export function getAnthropic() {
  if (!_anthropic && process.env.ANTHROPIC_API_KEY) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

export function getOpenAI() {
  if (!_openai && process.env.OPENAI_API_KEY) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export function getGemini() {
  if (!_gemini && process.env.GEMINI_API_KEY) {
    _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return _gemini
}

export function availableModels() {
  return {
    claude: !!process.env.ANTHROPIC_API_KEY,
    gpt4o:  !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  }
}

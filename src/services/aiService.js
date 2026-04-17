import { getAnthropic, getOpenAI, getGemini, availableModels } from '../config/ai.js'

const SYSTEM_PROMPTS = {
  chat: `You are NEXUS AI, an advanced AI assistant integrated into the NEXUS platform — a next-generation intelligence browser. You are helpful, knowledgeable, and adaptable. You excel at explaining complex topics clearly, writing code, solving problems, and engaging in thoughtful conversation.`,

  tutor: `You are NEXUS Tutor, a world-class adaptive AI teacher. Your mission is to make learning accessible to everyone from complete beginners to advanced experts.

TEACHING PRINCIPLES:
- Always detect the student's level from their question and adapt accordingly
- For beginners: Use analogies, real-world examples, step-by-step breakdowns, no jargon without explanation
- For intermediate: Balance theory with practice, introduce proper terminology, build on prior knowledge
- For advanced: Use technical depth, mathematical formulations, edge cases, research-level insights
- Always end with: (1) a short summary, (2) one follow-up question to check understanding, (3) a suggestion for what to learn next

SUBJECTS YOU EXCEL AT: Mathematics, Physics, Biology, Chemistry, Computer Science, Islamic Studies, History, Languages`,

  code: `You are NEXUS Code, an expert programming assistant supporting 50+ languages. You write clean, well-commented, production-quality code. You explain your code thoroughly, identify bugs, suggest optimizations, and teach best practices. Always include: the working code, an explanation of how it works, and any important caveats.`,

  math: `You are NEXUS Math, a mathematics tutor. Always solve problems step-by-step showing every intermediate step. Use clear notation. After solving, explain the method used and when to apply it. Check your work.`,
}

function buildSystemPrompt(mode, level) {
  const base  = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat
  const lvl   = level === 'beginner' ? '\n\nThe user is a BEGINNER. Use simple language, relatable analogies, and avoid jargon.'
              : level === 'advanced' ? '\n\nThe user is ADVANCED. Use technical depth, precise terminology, and assume strong background knowledge.'
              : ''
  return base + lvl
}

/* ── Claude (Anthropic) ── */
async function askClaude(systemPrompt, history, message) {
  const client = getAnthropic()
  if (!client) throw new Error('Anthropic API key not configured')

  const msgs = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const response = await client.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 2048,
    system:     systemPrompt,
    messages:   msgs,
  })

  return { reply: response.content[0].text, model: 'Claude' }
}

/* ── GPT-4o (OpenAI) ── */
async function askGPT4o(systemPrompt, history, message) {
  const client = getOpenAI()
  if (!client) throw new Error('OpenAI API key not configured')

  const msgs = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const response = await client.chat.completions.create({
    model:      'gpt-4o',
    messages:   msgs,
    max_tokens: 2048,
  })

  return { reply: response.choices[0].message.content, model: 'GPT-4o' }
}

/* ── Gemini ── */
async function askGemini(systemPrompt, history, message) {
  const genAI = getGemini()
  if (!genAI) throw new Error('Gemini API key not configured')

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Convert history to Gemini format and ensure first message is from user
  let chatHistory = history
    .filter(m => m.content && m.content.trim()) // Remove empty messages
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  // Gemini requires first message to be from user
  if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
    chatHistory = chatHistory.slice(1) // Remove first message if it's from model
  }

  // Alternate roles - Gemini doesn't allow two consecutive messages from same role
  const validHistory = []
  for (let i = 0; i < chatHistory.length; i++) {
    if (i === 0 || chatHistory[i].role !== validHistory[validHistory.length - 1].role) {
      validHistory.push(chatHistory[i])
    }
  }

  const chat = model.startChat({
    history: validHistory,
    systemInstruction: systemPrompt,
  })

  const result = await chat.sendMessage(message)
  return { reply: result.response.text(), model: 'Gemini' }
}

/* ── Smart fallback router ── */
export async function routeAI({ model, mode, level, history, message }) {
  const systemPrompt = buildSystemPrompt(mode, level)
  const available    = availableModels()

  // Try requested model, fall back to any available
  const order = [model, 'claude', 'gpt4o', 'gemini'].filter((v,i,a) => a.indexOf(v) === i)

  let lastError
  for (const m of order) {
    if (!available[m]) continue
    try {
      if (m === 'claude') return await askClaude(systemPrompt, history, message)
      if (m === 'gpt4o')  return await askGPT4o(systemPrompt, history, message)
      if (m === 'gemini') return await askGemini(systemPrompt, history, message)
    } catch (err) {
      lastError = err
      console.warn(`[AI] ${m} failed: ${err.message} — trying next model`)
    }
  }

  // No AI keys configured or all failed — return demo response
  console.log('[AI] All models failed, using demo mode')
  return {
    reply: `**NEXUS AI Demo Mode** 🤖

I'm running in demo mode because no valid AI API keys are available.

**To enable full AI capabilities:**

1. Get API keys from:
   • Claude: https://console.anthropic.com
   • OpenAI: https://platform.openai.com
   • Gemini: https://ai.google.dev

2. Add keys to \`backend/.env\`:
   \`\`\`
   ANTHROPIC_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   \`\`\`

3. Restart the backend server

---

**Your question was:** _"${message}"_

**Mode:** ${mode || 'chat'} | **Level:** ${level || 'intermediate'}

Once configured, I can provide detailed answers using Claude, GPT-4o, or Gemini!`,
    model: 'Demo',
  }
}

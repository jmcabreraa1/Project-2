'use strict'

require('dotenv').config()
const express = require('express')
const { anonymizeMessage, deanonymizeMessage } = require('./anonymizer')
const { connectToDatabase } = require('./db')
const OpenAIClient = require('./services/OpenAIClient')

const app = express()
const PORT = process.env.PORT || 3001
const SECRET = process.env.VAULT_SECRET || ''

// JSON body parsing with a conservative limit
app.use(express.json({ limit: '256kb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/anonymize', async (req, res) => {
  const { message } = req.body || {}
  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid request: "message" must be a non-empty string.' })
  }

  try {
    await connectToDatabase()
    const { anonymizedMessage } = await anonymizeMessage(message, { secret: SECRET })
    return res.json({ anonymizedMessage })
  } catch (err) {
    // Avoid leaking details of internals; log server-side if needed
    return res.status(500).json({ error: 'Failed to anonymize message.' })
  }
})

app.post('/deanonymize', async (req, res) => {
  const { anonymizedMessage } = req.body || {}
  if (typeof anonymizedMessage !== 'string' || anonymizedMessage.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid request: "anonymizedMessage" must be a non-empty string.' })
  }

  try {
    await connectToDatabase()
    const { message } = await deanonymizeMessage(anonymizedMessage)
    return res.json({ message })
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to deanonymize message.' })
  }
})

// Secure ChatGPT endpoint
app.post('/secureChatGPT', async (req, res) => {
  const { prompt, systemPrompt, temperature, maxTokens, model } = req.body || {}
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid request: "prompt" must be a non-empty string.' })
  }

  try {
    await connectToDatabase()

    // 1) Anonymize the incoming prompt
    const { anonymizedMessage: anonymizedPrompt } = await anonymizeMessage(prompt, { secret: SECRET })

    // 2) Call OpenAI with the anonymized prompt
    const headerKey = req.headers['x-openai-api-key']
    const ai = new OpenAIClient({ apiKey: typeof headerKey === 'string' ? headerKey : undefined })
    const aiResponse = await ai.completeText(anonymizedPrompt, {
      systemPrompt,
      model,
      temperature,
      maxTokens
    })

    // 3) De-anonymize the AI response
    const { message: deanonymizedResponse } = await deanonymizeMessage(aiResponse)

    // 4) Return the final response
    return res.json({ response: deanonymizedResponse })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('secureChatGPT failed:', err && err.message ? err.message : err)
    return res.status(500).json({ error: 'Failed to process secure ChatGPT request.' })
  }
})

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

app.listen(PORT, async () => {
  try {
    await connectToDatabase()
    // eslint-disable-next-line no-console
    console.log(`Connected to MongoDB`)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection failed:', e.message)
  }
  // eslint-disable-next-line no-console
  console.log(`Data Privacy Vault running on http://localhost:${PORT}`)
})



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

// Helper function for delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Secure ChatGPT endpoint
app.post('/secureChatGPT', async (req, res) => {
  const { prompt, systemPrompt, temperature, maxTokens, model } = req.body || {}
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid request: "prompt" must be a non-empty string.' })
  }

  try {
    // eslint-disable-next-line no-console
    console.log('\n=== SECURE CHATGPT REQUEST ===')
    // eslint-disable-next-line no-console
    console.log('📥 Paso 1: Prompt original recibido:')
    // eslint-disable-next-line no-console
    console.log(`   "${prompt}"`)
    // eslint-disable-next-line no-console
    console.log('   ⏳ Esperando 15 segundos antes del siguiente paso...')
    await delay(15000)

    await connectToDatabase()

    // 1) Anonymize the incoming prompt
    // eslint-disable-next-line no-console
    console.log('\n🔒 Paso 2: Anonimizando información privada...')
    const { anonymizedMessage: anonymizedPrompt } = await anonymizeMessage(prompt, { secret: SECRET })
    // eslint-disable-next-line no-console
    console.log('   Prompt anonimizado:')
    // eslint-disable-next-line no-console
    console.log(`   "${anonymizedPrompt}"`)
    // eslint-disable-next-line no-console
    console.log('   ⏳ Esperando 15 segundos antes del siguiente paso...')
    await delay(15000)

    // 2) Call OpenAI with the anonymized prompt
    // eslint-disable-next-line no-console
    console.log('\n🤖 Paso 3: Enviando prompt anonimizado a OpenAI...')
    const headerKey = req.headers['x-openai-api-key']
    const ai = new OpenAIClient({ apiKey: typeof headerKey === 'string' ? headerKey : undefined })
    const aiResponse = await ai.completeText(anonymizedPrompt, {
      systemPrompt,
      model,
      temperature,
      maxTokens
    })
    // eslint-disable-next-line no-console
    console.log('   Respuesta de OpenAI (aún anonimizada):')
    // eslint-disable-next-line no-console
    console.log(`   "${aiResponse}"`)
    // eslint-disable-next-line no-console
    console.log('   ⏳ Esperando 15 segundos antes del siguiente paso...')
    await delay(15000)

    // 3) De-anonymize the AI response
    // eslint-disable-next-line no-console
    console.log('\n🔓 Paso 4: Desanonimizando respuesta de OpenAI...')
    const { message: deanonymizedResponse } = await deanonymizeMessage(aiResponse)
    // eslint-disable-next-line no-console
    console.log('   Respuesta final (desanonimizada):')
    // eslint-disable-next-line no-console
    console.log(`   "${deanonymizedResponse}"`)
    // eslint-disable-next-line no-console
    console.log('   ⏳ Esperando 15 segundos antes del siguiente paso...')
    await delay(15000)

    // 4) Return the final response
    // eslint-disable-next-line no-console
    console.log('\n✅ Paso 5: Enviando respuesta al cliente')
    // eslint-disable-next-line no-console
    console.log('=== FIN DEL PROCESO ===\n')
    return res.json({ response: deanonymizedResponse })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('\n❌ ERROR en secureChatGPT:', err && err.message ? err.message : err)
    // eslint-disable-next-line no-console
    console.log('=== FIN DEL PROCESO (CON ERROR) ===\n')
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



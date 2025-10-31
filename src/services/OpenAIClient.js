'use strict'

const OpenAI = require('openai')

class OpenAIClient {
  /**
   * @param {object} opts
   * @param {string} [opts.apiKey] - If not provided, uses process.env.OPENAI_API_KEY
   * @param {string} [opts.model] - Default model to use for completions
   */
  constructor(opts = {}) {
    const apiKey = opts.apiKey || process.env.OPENAI_API_KEY || ''
    if (!apiKey) {
      throw new Error('Missing OpenAI API key. Set OPENAI_API_KEY env or pass { apiKey }.')
    }
    this.client = new OpenAI({ apiKey })
    this.model = opts.model || process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }

  /**
   * Get a text completion using Chat Completions API.
   * @param {string} prompt - User prompt
   * @param {object} [options]
   * @param {string} [options.systemPrompt] - Optional system instruction
   * @param {string} [options.model] - Override default model
   * @param {number} [options.temperature]
   * @param {number} [options.maxTokens]
   * @returns {Promise<string>} - Assistant text
   */
  async completeText(prompt, options = {}) {
    const systemPrompt = options.systemPrompt || 'You are a helpful assistant.'
    const model = options.model || this.model
    const temperature = typeof options.temperature === 'number' ? options.temperature : 0.7
    const maxTokens = typeof options.maxTokens === 'number' ? options.maxTokens : 512

    const response = await this.client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })

    const choice = response && response.choices && response.choices[0]
    const content = choice && choice.message && choice.message.content
    return content || ''
  }
}

module.exports = OpenAIClient


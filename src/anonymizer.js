'use strict'

const crypto = require('crypto')
const TokenMap = require('./models/TokenMap')

const TOKEN_LENGTH = 12
const PREFIX = {
  email: 'EMAIL_',
  phone: 'PHONE_',
  name: 'NAME_'
}

/**
 * Create a short, deterministic token for a given value.
 * Uses SHA-256 with an optional secret salt; returns hex truncated to TOKEN_LENGTH.
 *
 * @param {string} value
 * @param {string} secret
 * @returns {string}
 */
function hashToken(value, secret) {
  const salt = secret || ''
  const hash = crypto.createHash('sha256').update(`${salt}|${value}`).digest('hex')
  return hash.slice(0, TOKEN_LENGTH)
}

async function upsertToken(type, valueKey, originalValue, secret) {
  const token = `${PREFIX[type]}${hashToken(valueKey, secret)}`
  await TokenMap.updateOne(
    { token },
    { $setOnInsert: { token, original: originalValue, type, createdAt: new Date() } },
    { upsert: true }
  )
  return token
}

/**
 * Replace emails with tokens.
 * @param {string} text
 * @param {string} secret
 * @returns {string}
 */
async function anonymizeEmails(text, secret) {
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  const matches = Array.from(text.matchAll(emailRegex)).map(m => m[0])
  const unique = Array.from(new Set(matches))
  const map = new Map()
  await Promise.all(unique.map(async (email) => {
    const key = email.toLowerCase()
    const token = await upsertToken('email', key, email, secret)
    map.set(email, token)
  }))
  return text.replace(emailRegex, (m) => map.get(m) || m)
}

/**
 * Replace phone numbers with tokens.
 * Heuristic: Detect sequences of digits (7-15) possibly containing spaces, dashes, dots, parentheses, and optional leading +.
 * @param {string} text
 * @param {string} secret
 * @returns {string}
 */
async function anonymizePhones(text, secret) {
  const phoneLike = /\b(?:\+?\d[\d\s\-().]{5,}\d)\b/g
  const matches = Array.from(text.matchAll(phoneLike)).map(m => m[0])
  const unique = Array.from(new Set(matches))
  const map = new Map()
  await Promise.all(unique.map(async (raw) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) {
      return
    }
    const token = await upsertToken('phone', digits, raw, secret)
    map.set(raw, token)
  }))
  return text.replace(phoneLike, (m) => {
    const digits = m.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) return m
    return map.get(m) || m
  })
}

/**
 * Replace likely full names with a single token for the full name.
 * Targets 2-3 capitalized words (supports Spanish accents and Ñ/ñ).
 * @param {string} text
 * @param {string} secret
 * @returns {string}
 */
async function anonymizeNames(text, secret) {
  const capWord = '[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+'
  const fullNameRegex = new RegExp(`\\b(${capWord}(?:\\s+${capWord}){1,2})\\b`, 'g')
  const matches = Array.from(text.matchAll(fullNameRegex)).map(m => m[0])
  const unique = Array.from(new Set(matches))
  const map = new Map()
  await Promise.all(unique.map(async (full) => {
    const key = full
    const token = await upsertToken('name', key, full, secret)
    map.set(full, token)
  }))
  return text.replace(fullNameRegex, (m) => map.get(m) || m)
}

/**
 * Anonymize a message by tokenizing emails, phone numbers, and likely names.
 * Order matters: emails -> phones -> names
 * @param {string} message
 * @param {object} opts
 * @param {string} [opts.secret]
 * @returns {{ anonymizedMessage: string }}
 */
async function anonymizeMessage(message, opts = {}) {
  const secret = opts.secret || ''
  let result = String(message)
  result = await anonymizeEmails(result, secret)
  result = await anonymizePhones(result, secret)
  result = await anonymizeNames(result, secret)
  return { anonymizedMessage: result }
}

/**
 * Deanonymize a message by looking up tokens in the in-memory store.
 * Leaves unknown tokens untouched.
 * @param {string} anonymizedMessage
 * @returns {{ message: string }}
 */
async function deanonymizeMessage(anonymizedMessage) {
  const tokenRegex = /\b(?:NAME|EMAIL|PHONE)_[a-f0-9]{12}\b/g
  const text = String(anonymizedMessage)
  const tokens = Array.from(new Set((text.match(tokenRegex) || [])))
  if (tokens.length === 0) return { message: text }

  const docs = await TokenMap.find({ token: { $in: tokens } }).lean()
  const map = new Map(docs.map(d => [d.token, d.original]))
  const message = text.replace(tokenRegex, (t) => map.get(t) || t)
  return { message }
}

module.exports = {
  anonymizeMessage,
  deanonymizeMessage
}



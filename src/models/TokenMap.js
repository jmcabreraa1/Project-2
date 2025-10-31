'use strict'

const mongoose = require('mongoose')

const TokenMapSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    original: { type: String, required: true },
    type: { type: String, enum: ['email', 'phone', 'name'], required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'token_maps' }
)

module.exports = mongoose.model('TokenMap', TokenMapSchema)






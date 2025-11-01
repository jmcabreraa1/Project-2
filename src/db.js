'use strict'

const mongoose = require('mongoose')

let isConnected = false

async function connectToDatabase() {
  if (isConnected) return mongoose.connection

  const uri = process.env.MONGODB_URI || 'mongodb+srv://jmcabreraa1_db_user:Mm44qu6VVltjtFsk@projectia.z8n6scu.mongodb.net/?appName=projectIA'
  const dbName = process.env.MONGODB_DB || 'projectIA'

  await mongoose.connect(uri, {
    dbName,
    autoIndex: true
  })
  isConnected = true
  return mongoose.connection
}

module.exports = { connectToDatabase }







require('dotenv').config()
process.on('uncaughtException', (error) => {
  console.error(error)
})

process.on('unhandledRejection', (error) => {
  console.error(error)
})

const SimplDB = require('simpl.db')
const db = new SimplDB()
const Acol = require('./Structures/Bot')
const config = require('./Structures/BotConfig')
const client = new Acol(config)

client.db = db
client.connect()

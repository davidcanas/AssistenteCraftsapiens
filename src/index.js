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
function MsToDate (time) {
  if (!time) return '0D:0H:0M:0S'
  if (isNaN(time)) return '0D:0H:0M:0S'
  time = Math.round(time / 1000)

  const s = time % 60
  const m = ~~((time / 60) % 60)
  const h = ~~((time / 60 / 60) % 24)
  const d = ~~(time / 60 / 60 / 24)

  return `${d}D:${h}H:${m}M:${s}S`
}
client.MsToDate = MsToDate
client.db = db
client.connect()

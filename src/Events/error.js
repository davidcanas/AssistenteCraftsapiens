const Event = require('../Structures/EventBase')

module.exports = class extends Event {
  async run (error) {
    if (error.message.includes('Unknown Message')) return
    console.error('\u001b[31m', 'Erro: ' + error)
  }
}

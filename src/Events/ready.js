const Event = require('../Structures/EventBase')

module.exports = class extends Event {
  constructor (...args) {
    super(...args, {
      once: true
    })
  }

  async run () {
    this.client.utils
      .loadInteractions()
      .then(
        console.log(
          '\u001b[32m', '[ASSISTENTE_CRAFTSAPIENS] - Interações carregadas com sucesso | BOT ONLINE!'
        )
      )
      .catch(console.error)

    this.client.editStatus('online', [
      {
        name: '👀 jogar.craftsapiens.com.br',
        type: 3
      }
    ])
  }
}

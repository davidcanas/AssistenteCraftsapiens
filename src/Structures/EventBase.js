module.exports = class Event {
  constructor (client, name, options = {}) {
    this.name = name
    this.client = client
    this.type = options.once ? 'once' : 'on'
    this.handler = options.handler
    this.emitter = this.client
  }

  async run () {
    throw new Error(
        `Meu programador é um lixo e não definiu o método run() para o evento ${this.name}!`
    )
  }
}

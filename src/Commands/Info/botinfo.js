const InteractionBase = require('../../Structures/CommandBase')
module.exports = class PingInteraction extends InteractionBase {
  constructor (...args) {
    super(...args, {
      name: 'botinfo',
      description: 'Vê informações do uso do bot',
      options: []
    })
  }

  async run (interaction) {
    let ping = this.client.shards.get(0).latency
    if (ping === 'Infinity') ping = '0'
    interaction.createMessage({
      content: `📡 | Ping: ${ping}ms\n📈 | Ram: ${(
        process.memoryUsage().heapUsed /
        1024 /
        1024
      ).toFixed(2)}MB \n📊 | CPU: ${(
        process.cpuUsage().system /
        1024 /
        1024
      ).toFixed(2)}%\n⏱️ | Uptime: ${this.client.MsToDate(this.client.uptime)}`
    })
  }
}

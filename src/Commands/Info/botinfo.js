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
    // variavel com o uptime do bot
    const totalSeconds = this.client.uptime / 1000
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor(totalSeconds / 3600)
    const uptime = `${days}D:${hours}H:${Math.floor(
      totalSeconds / 60
    )}MIN:${Math.floor(totalSeconds % 60)}S`

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
      ).toFixed(2)}%\n⏱️ | Uptime: ${uptime}`
    })
  }
}

const InteractionBase = require('../../Structures/CommandBase')
module.exports = class PingInteraction extends InteractionBase {
  constructor (...args) {
    super(...args, {
      name: 'listaulas',
      description: 'Lista as aulas registradas no banco de dados',
      options: []
    })
  }

  async run (interaction) {
    if (!this.client.whitelistedID.includes(interaction.user.id)) {
      return interaction.createMessage({
        content: 'Você não tem permissão para usar esse comando!',
        flags: 1 << 6
      })
    }

    const dados = this.client.dbaula.getAll()
    const data = []
    for (let i = 0; i < dados.length; i++) {
      data.push(`**${dados[i].beautyData}** | ${dados[i].diaDaSemana} - ${dados[i].aula} `)
    }
    interaction.createMessage({
      content: data.join('\n'),
      flags: 1 << 6
    })
  }
}

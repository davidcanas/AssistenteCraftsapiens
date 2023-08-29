const Eris = require('eris')
const Event = require('../Structures/EventBase')

module.exports = class extends Event {
  async run (interaction) {
    if (interaction instanceof Eris.CommandInteraction) {
      if (!interaction.guildID) return
      try {
        const command = this.client.interactions.get(interaction.data.name)
        if (!command) return
        if (!interaction.options) return await command.run(interaction)
        return await command.run(
          interaction,
          interaction.options._options.map((value) => value.value)
        )
      } catch (err) {
        interaction.createMessage({
          content: 'Ocorreu um erro na execução desse comando!',
          ephemeral: true
        })
        console.log(err)
      }
    } else if (interaction instanceof Eris.ComponentInteraction) {
      if (interaction.data.custom_id === 'confirm') {
        const autor = interaction.message.mentions[0]

        if (
          interaction.member.roles.includes('959259258829021255') ||
          interaction.member.roles.includes('917900552225054750') ||
          interaction.member.roles.includes('901251917991256124')
        ) {
          interaction.message.channel.deleteMessage(
            interaction.message.messageReference.messageID
          )
          interaction.message.delete()
          return interaction.createMessage({
            content:
              '😳 Opa opa, você acaba de usar **ADMIN POWER** , mensagem apagada com sucesso, rs.',
            flags: 1 << 6
          })
        }

        if (interaction.member.id !== autor.id) {
          return interaction.createMessage({
            content:
              'Esse botão é de @' +
              autor.username +
              ' , apenas ele pode confirmar a leitura!',
            flags: 1 << 6
          })
        }
        interaction.createMessage({
          content: 'Obrigado por confirmar a sua leitura :D.',
          flags: 1 << 6
        })

        interaction.message.channel.deleteMessage(
          interaction.message.messageReference.messageID
        )
        interaction.message.delete()
        this.client.db.delete(autor.id)
      }
    }
  }
}

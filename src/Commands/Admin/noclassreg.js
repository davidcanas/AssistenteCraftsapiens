const InteractionBase = require('../../Structures/CommandBase')
module.exports = class PingInteraction extends InteractionBase {
  constructor (...args) {
    super(...args, {
      name: 'noaulamode',
      description: 'Caso não haja aulas algum dia da semana, ou uma semana,ative o sistema.',
      options: [{
        type: 3,
        name: 'oquefazer',
        description: 'Ativar ou desativar o sistema de não haver aulas',
        required: true,
        choices: [
          {
            name: 'Ativar sistema (não haverão aulas)',
            value: 'on'
          },
          {
            name: 'Desativar sistema (voltarão a haver aulas)',
            value: 'off'
          }
        ]
      },
      {
        type: 3,
        name: 'motivo',
        description: '(Caso seja para ativar) Motivo de não haver aulas',
        required: false

      }]
    })
  }

  async run (interaction) {
    if (!this.client.whitelistedID.includes(interaction.member.id)) {
      return interaction.createMessage({ content: 'Você não tem permissão para usar esse comando!', flags: 1 << 6 })
    }

    if (interaction.data.options[0].value === 'off') {
      this.client.db.set('noclass', { state: false, reason: ' ' })
      interaction.createMessage({ content: 'Prontinho! Agora voltarão a haver aulas durante a semana!', flags: 1 << 6 })
    } else {
      if (!interaction.data.options[1]) return interaction.createMessage({ content: 'Por favor, especifique um motivo para não haver aulas!', flags: 1 << 6 })
      this.client.db.set('noclass', { state: true, reason: interaction.data.options[1].value })
      interaction.createMessage({ content: 'Prontinho! Agora não haverão aulas durante a semana!\n\nMotivo: `' + interaction.data.options[1].value + '`\n\n`Não te esqueças de usar o comando novamente quando voltarem a haver aulas!`', flags: 1 << 6 })
    }
  }
}

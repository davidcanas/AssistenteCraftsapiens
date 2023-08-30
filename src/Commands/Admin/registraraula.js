const InteractionBase = require('../../Structures/CommandBase')
module.exports = class PingInteraction extends InteractionBase {
  constructor (...args) {
    super(...args, {
      name: 'regaula',
      description: 'Registra uma aula para um dia da semana especifico no banco de dados',
      options: [{
        type: 3,
        name: 'diadasemana',
        description: 'O dia da semana que a aula vai ser registrada (para essa semana)',
        choices: [
          {
            name: 'Segunda-Feira',
            value: 'segunda'
          },
          {
            name: 'Terça-Feira',
            value: 'terca'
          },
          {
            name: 'Quarta-Feira',
            value: 'quarta'
          },
          {
            name: 'Quinta-Feira',
            value: 'quinta'
          },
          {
            name: 'Sexta-Feira',
            value: 'sexta'
          },
          {
            name: 'Sábado',
            value: 'sabado'
          }
        ],
        required: true
      },
      {
        type: 3,
        name: 'aula',
        description: 'A aula que vai ser registrada',
        required: true
      }]
    })
  }

  async run (interaction) {
    if (!this.client.whitelistedID.includes(interaction.user.id)) {
      return interaction.createMessage({
        content: 'Você não tem permissão para usar esse comando!',
        flags: 1 << 6
      })
    }
    let data

    switch (interaction.data.options[0].value) {
      case 'segunda':
        data = new Date()
        data.setDate(data.getDate() + (1 + 7 - data.getDay()) % 7)
        break
      case 'terca':
        data = new Date()
        data.setDate(data.getDate() + (2 + 7 - data.getDay()) % 7)
        break
      case 'quarta':
        data = new Date()
        data.setDate(data.getDate() + (3 + 7 - data.getDay()) % 7)
        break
      case 'quinta':
        data = new Date()
        data.setDate(data.getDate() + (4 + 7 - data.getDay()) % 7)
        break
      case 'sexta':
        data = new Date()
        data.setDate(data.getDate() + (5 + 7 - data.getDay()) % 7)
        break
      case 'sabado':
        data = new Date()
        data.setDate(data.getDate() + (6 + 7 - data.getDay()) % 7)
        break
    }

    const diaDaSemana = interaction.data.options[0].value
    const aula = interaction.data.options[1].value

    data = data.toLocaleDateString('pt-BR').split('/').reverse().join('')
    // a variavel beautyData vai armazenar a data no foramto DD/MM/YY
    const beautyData = data.split('').reverse().join('').slice(0, 2).split('').reverse().join('') + '/' + data.split('').reverse().join('').slice(2, 4).split('').reverse().join('') + '/' + data.split('').reverse().join('').slice(4, 8).split('').reverse().join('')

    if (this.client.dbaula.get(a => a.data === data)) {
      return interaction.createMessage({
        content: `Já existe uma aula registrada para ${diaDaSemana}!`,
        flags: 1 << 6
      })
    }
    // variavel ns é o numero do dia da semana
    let ns = 0
    switch (diaDaSemana) {
      case 'segunda':
        ns = 1
        break
      case 'terca':
        ns = 2
        break
      case 'quarta':
        ns = 3
        break
      case 'quinta':
        ns = 4
        break
      case 'sexta':
        ns = 5
        break
      case 'sabado':
        ns = 6
        break
    }

    this.client.dbaula.create({ aula, diaDaSemana, data, beautyData, ns })

    interaction.createMessage({
      content: `A aula ${aula} foi registrada para ${diaDaSemana}!`,
      flags: 1 << 6
    })
  }
}

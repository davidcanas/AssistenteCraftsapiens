const Event = require('../Structures/EventBase')
module.exports = class extends Event {
  async run (message) {
    if (message.author.bot) return
    if (message.author.id === '828745580125225031') {
      return console.log('Ignorando Heltonn')
    }
    if (
      message.channel.name.includes('ticket-') ||
            message.channel.name.includes('closed-')
    ) {
      if (
        message.member.roles.includes('939956623441555558') ||
                message.member.roles.includes('917900552225054750') ||
                message.member.roles.includes('901251917991256124')
      ) {
        return
      }

      const hora = new Date()
        .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        .split(' ')[1]
        .split(':')[0]
      let saudacao = ''
      if (hora >= 6 && hora < 12) {
        saudacao = 'bom dia'
      } else if (hora >= 12 && hora < 18) {
        saudacao = 'boa tarde'
      } else if (hora >= 18 && hora < 24) {
        saudacao = 'boa noite'
      } else if (hora >= 0 && hora < 6) {
        saudacao = 'boa madrugada'
      }

      const possibilidades = [
        'denuncia',
        'denúncia',
        'reportar',
        'queixa',
        'hack',
        'mute',
        'mutar',
        'xingou',
        'insultou',
        'assediou',
        'violou',
        'abus',
        'fodeu',
        'abusou',
        'abusa',
        'estrupou',
        'ofendeu',
        'suicídio',
        'suicidio',
        'ofendendo',
        'roub',
        'grief',
        'griffou',
        'invadiu'
      ]

      if (
        possibilidades.some((v) => message.content.toLowerCase().includes(v))
      ) {
        if (
          this.client.db.get(message.channel.id) &&
                    this.client.db.get(message.channel.id).sent
        ) {
          console.log(
            '\u001b[33m', 'Ignorando tentativa de acionar sistema em ' +
                        message.channel.name +
                        ' !'
          )
          return
        }
        this.client.db.set(message.channel.id, { sent: true })

        message.channel.createMessage({
          embeds: [
            {
              id: 668978070,
              description: `Olá, ${message.author.mention}, ${saudacao}, você está tentando reportar alguém? \nSe sim, por favor, pedimos que nos envie:\n\`\`\`\n* Nick do jogador a denunciar\n* Explicação do ocorrido \n* Provas (em tela cheia)\n\`\`\``,
              fields: [],
              footer: {
                text: 'Suporte | Craftsapiens',
                icon_url:
                                    'https://cdn.discordapp.com/avatars/968686499409313804/9c644fe8502c2dfdf976947c66671749.png?size=4096'
              },
              color: 15204352
            }
          ]
        })
        this.client.db.add('uses', 1)
      }
    }

    const arrayHoje = [
      'quando',
      'horas',
      'hoje',
      'hj',
      'vai',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sabado',
      'sábado',
      'domingo',
      'amanhã',
      'amanha'
    ]
    // Ignora o Helton ou qualquer mensagem no canal de avisos
    if (message.author.id === '828745580125225031' || message.channel.id === '1010026917208002591') {
      console.log('Ignorando canal de avisos e/ou Helton acionando sistema')
      return
    }

    if (
      message.content.toLowerCase().includes('aula') &&
            arrayHoje.some((v) => message.content.toLowerCase().includes(v))
    ) {
      if (
        this.client.dbuser.get(u => u.id === message.author.id && u.sent === true)
      ) {
        console.log(
          '\u001b[33m', 'Ignorando tentativa de acionar sistema em ' +
                    message.channel.name +
                    ' !'
        )
        return
      }
      const hoje = new Date()
      const ano = hoje.getFullYear()
      const hora = new Date()
        .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        .split(' ')[1]
        .split(':')[0]
      const mes = hoje.getMonth() + 1
      const dia = (hoje.getDate() < 10 ? '0' : '') + hoje.getDate()
      let diaSemana = hoje.getDay()
      let saudacao = ''
      if (hora >= 6 && hora < 12) {
        saudacao = 'bom dia'
      } else if (hora >= 12 && hora < 18) {
        saudacao = 'boa tarde'
      } else if (hora >= 18 && hora < 24) {
        saudacao = 'boa noite'
      } else if (hora >= 0 && hora < 6) {
        saudacao = 'boa madrugada'
      }

      const feriadosBrasil = [
        '01/1/' + ano,
        '01/1/' + ano,
        '21/04/' + ano,
        '01/5/' + ano,
        '07/9/' + ano,
        '12/10/' + ano,
        '02/11/' + ano,
        '15/11/' + ano,
        '25/12/' + ano
      ]
      const stringFeriados = feriadosBrasil.join()
      const dataAtual = dia + '/' + mes + '/' + ano
      const ehFeriado = stringFeriados.includes(dataAtual)
      let embedColor
      let reactEmoji
      let emojiInicio

      if (message.content.toLowerCase().includes('segunda')) {
        diaSemana = 1
      } else if (message.content.toLowerCase().includes('terça')) {
        diaSemana = 2
      } else if (message.content.toLowerCase().includes('quarta')) {
        diaSemana = 3
      } else if (message.content.toLowerCase().includes('quinta')) {
        diaSemana = 4
      } else if (message.content.toLowerCase().includes('sexta')) {
        diaSemana = 5
      } else if (
        message.content.toLowerCase().includes('sábado') ||
                message.content.toLowerCase().includes('sabado')
      ) {
        diaSemana = 6
      } else if (message.content.toLowerCase().includes('domingo')) {
        diaSemana = 0
      } else if (
        message.content.toLowerCase().includes('amanha') ||
                message.content.toLowerCase().includes('amanhã')
      ) {
        diaSemana = diaSemana + 1
      } else {
        diaSemana = hoje.getDay()
      }
      console.log(this.client.db.get('noclass'))
      // eslint-disable-next-line no-inner-declarations
      function verificarDiaUtil (client) {
        if (ehFeriado) {
          reactEmoji = '❌'
          embedColor = 15204352
          emojiInicio = '<:pepetear:1145856597579542568>'

          let nomeFeriado
          switch (dataAtual) {
            case '01/1/' + ano:
              nomeFeriado = 'Ano Novo'
              break
            case '21/4/' + ano:
              nomeFeriado = 'Tiradentes'
              break
            case '01/5/' + ano:
              nomeFeriado = 'Dia do Trabalho'
              break
            case '07/9/' + ano:
              nomeFeriado = 'Independência do Brasil'
              break
            case '12/10/' + ano:
              nomeFeriado = 'Nossa Senhora Aparecida'
              break
            case '02/11/' + ano:
              nomeFeriado = 'Finados'
              break
            case '15/11/' + ano:
              nomeFeriado = 'Proclamação da República'
              break
            case '25/12/' + ano:
              nomeFeriado = 'Natal'
              break
          }
          return `Durante os feriados não temos aula. As aulas gratuitas ocorrem todos os dias, de segunda a sexta-feira. às 18:30h e as aulas Premium às 19:30h. Eventualmente ocorrem aulas ao sábado, fique de olho no cronograma.\nHoje é feriado de \`${nomeFeriado}\`, logo não haverá aula`
        } else if (client.db.get('noclass.state')) {
          const reason = client.db.get('noclass.reason')
          reactEmoji = '❌'
          embedColor = 15204352
          emojiInicio = '<:pepetear:1145856597579542568>'
          return `Foi definido pela equipe que não haverá aulas por motivo de \`${reason}\`. As aulas gratuitas ocorrem todos os dias, de segunda a sexta-feira. às 18:30h e as aulas Premium às 19:30h. Eventualmente ocorrem aulas ao sábado, fique de olho no cronograma.`
        } else if (diaSemana === 0) {
          reactEmoji = '❌'
          embedColor = 15204352
          emojiInicio = '<:pepetear:1145856597579542568>'
          return 'Durante os finais de semana não temos aula. As aulas gratuitas ocorrem todos os dias, de segunda a sexta-feira. às 18:30h e as aulas Premium às 19:30h. Eventualmente ocorrem aulas ao sábado, fique de olho no cronograma.'
        } else if (diaSemana === 6) {
          reactEmoji = 'steve_pensando:905024502038147142'
          embedColor = 16776960
          emojiInicio = '<:steve_pensando:905024502038147142>'
          return 'As aulas gratuitas ocorrem todos os dias, de segunda a sexta-feira. às 18:30h e as aulas Premium às 19:30h. **Eventualmente ocorrem aulas ao sábado, fique de olho no cronograma**.'
        } else {
          reactEmoji = '✅'
          embedColor = 3066993
          emojiInicio = '<:sir_derp:1145737198868647936>'
          return 'As aulas gratuitas ocorrem todos os dias, de segunda a sexta-feira. às 18:30h e as aulas Premium às 19:30h. Eventualmente ocorrem aulas ao sábado, fique de olho no cronograma.'
        }
      }
      const fun = verificarDiaUtil(this.client)
      message.addReaction(reactEmoji)
      console.log(dataAtual)

      const msg = await message.channel.createMessage({
        content: message.member.mention,
        messageReference: { messageID: message.id },
        embeds: [
          {
            description: `${emojiInicio} Olá, ${saudacao}. ${fun}\n\n<:purplearrow:1145719018121089045> Verifique o [Cronograma](https://discord.com/channels/892472046729179136/939937615325560912) ou nosso [Instagram](https://www.instagram.com/universidadecraftsapiens/) para mais informações!\n<:purplearrow:1145719018121089045> [Saiba como entrar no servidor](https://craftsapiens.canasdev.tech/)`,
            color: embedColor,
            footer: {
              text: 'Assistente | Confirme a leitura para poder acionar o sistema de novo',
              icon_url:
                                'https://cdn.discordapp.com/avatars/968686499409313804/9c644fe8502c2dfdf976947c66671749.png?size=4096'
            }
          }
        ],
        components: [
          {
            type: 1,
            components: [
              {
                style: 2,
                label: 'Confirmar leitura.',
                custom_id: 'confirm',
                disabled: false,
                emoji: {
                  id: '1145724790271910031',
                  name: 'pepereading',
                  animated: false
                },
                type: 2
              }
            ]
          }
        ]
      })
      this.client.db.add('uses', 1)

      if (message.author.id !== '733963304610824252') {
        this.client.dbuser.create({ id: message.author.id, sent: true })
      }
      setTimeout(() => {
        this.client.dbuser.remove(u => u.id === message.author.id)
        if (message) message.delete()
        if (msg) msg.delete()
        console.log(
          '\u001b[33m', 'Devido a 5 minutos sem resposta ' + message.author.username + ' foi removido da lista de usuários que acionaram o sistema, e a mensagem foi deletada.'
        )
      }
      , 300000)
    }

    const blacklistedWords = [
      'meu servidor',
      'meu server',
      'meu sv',
      'aternos',
      'jogar no meu',
      'entrar no meu',
      'redelufty',
      'hypixel',
      'mush',
      'hylex'
    ]

    if (blacklistedWords.some((v) => message.content.toLowerCase().includes(v))) {
      this.client.users.get('733963304610824252').getDMChannel().then(a => a.createMessage(`Mensagem de **@${message.author.username} (${message.author.id})** foi deletada por conter possiveis divulgações de outros servidores.\n\n\`\`\`${message.content}\`\`\``))
      return message.delete()
    }
  }
}

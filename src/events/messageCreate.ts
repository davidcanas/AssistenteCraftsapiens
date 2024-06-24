/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-inner-declarations */
import Client from '../structures/Client';
import { Message } from 'oceanic.js';
import CommandContext from '../structures/CommandContext';

export default class MessageCreate {
	client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async run(message: Message) {
		const prefix = '-';


		if (message.author.bot) return;

		if (message.content.match(/^\d{4}$/)) {
           const component = {
				type: 1,
				components: [
					{
						type: 2,
						style: 2,
						customID: 'confirm_read',
						label: 'Ok, obrigado!',
						emoji: {
							id: '1145724790271910031',
							name: 'pepereading'
						}
					}
				]
			};

			if(!message.channel) {

				message.author.createDM().then(a => 
					a.createMessage({ 
						content: `<:sir_derp:1145737198868647936> Olá, ${message.author.mention}!\nParece que você está tentando vincular sua conta do discord com o Minecraft, por favor, envie o código \`${message.content}\` para o privado do <@968686499409313804>`,
					}));

				return;
			}
			return message.channel.createMessage({
				content: `<:sir_derp:1145737198868647936> Olá, <@${message.author.id}>!\nParece que você está tentando vincular sua conta do discord com o Minecraft, por favor, envie o código \`${message.content}\` para o privado do <@968686499409313804>`,
				messageReference: { messageID: message.id },
				components: [component]
			});

		}
		if (message.channel.type === 1) return;

		for (const collector of this.client.messageCollectors) {
			if (collector.channel.id === message.channel.id) {
				collector.collect(message);
			}
		}

		async function checkForLinks(db, phrase: string) {
			const words = phrase.split(' ');
			const dbFind = await db.findOne({ id: message.guild.id });
			if (!dbFind) return;
			const whitelisted = dbFind.whitelistedUrl;

			const found = words.filter(word => {
				const linkRegex = new RegExp(/(www\.|http:|https:)+[^\s]+[\w]/);
				if (whitelisted.some(whitelisted => word.includes(whitelisted))) {
					return false;
				}
				return linkRegex.test(word);
			});

			return found.length > 0;
		}
    
		if (!this.client.allowedUsers.includes(message.author.id) && message.channel.parentID !== '939954056040947812' && message.channel.parentID !== '1019395077497434222' && message.channel.parentID !== null) {
			const db = await this.client.db.global.findOne({id: message.guild.id});
			if (db.whitelistedUrlEnabled) {
			if (await checkForLinks(this.client.db.global, message.content)) {
				message.delete();
				db.urlsDeleted++;
				db.save();
				console.log('Mensagem de ' + message.author.username + ' foi deletada por conter links.');
				return;
				}
			}

		}

	if (message.channel.name.includes('ticket-') || message.channel.name.includes('closed-')) {


			const hora = new Date()
				.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
				.split(' ')[1]
				.split(':')[0];
			let saudacao = '';
			if (parseInt(hora) >= 6 && parseInt(hora) < 12) {
				saudacao = 'bom dia';
			} else if (parseInt(hora) >= 12 && parseInt(hora) < 18) {
				saudacao = 'boa tarde';
			} else if (parseInt(hora) >= 18 && parseInt(hora) < 24) {
				saudacao = 'boa noite';
			} else if (parseInt(hora) >= 0 && parseInt(hora) < 6) {
				saudacao = 'boa madrugada';
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
			];

			if (!message.content.startsWith(prefix) && possibilidades.some((v) => message.content.toLowerCase().includes(v))) {
				if (this.client.ignoreRoles.some((v) => message.member.roles.includes(v))) {
					console.log('\u001b[33m', 'Ignorando tentativa de staff acionar sistema em ' + message.channel.name + ' !');
					return;
				}
				const dbcheck = await this.client.db.global.findOne({ id: message.channel.guild.id });

				if (dbcheck && dbcheck.ignoredChannels.includes(message.channel.id)) {
					console.log('\u001b[33m', 'Ignorando tentativa de acionar sistema em ' + message.channel.name + ' !');
					return;
				}

				dbcheck.ignoredChannels.push(message.channel.id);

				message.channel.createMessage({
					embeds: [
						{
							description: `Olá, ${message.author.mention}, ${saudacao}, você está tentando reportar alguém? \nSe sim, por favor, pedimos que nos envie:\n\`\`\`\n* Nick do jogador a denunciar\n* Explicação do ocorrido \n* Provas (em tela cheia)\n\`\`\``,
							fields: [],
							footer: {
								text: 'Suporte | Craftsapiens',
								iconURL:
                  'https://cdn.discordapp.com/avatars/968686499409313804/9c644fe8502c2dfdf976947c66671749.png?size=4096'
							},
							color: 15204352
						}
					]
				});
				dbcheck.helped++;
				dbcheck.save();
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
		];
		// Ignora o Helton ou qualquer mensagem no canal de avisos
		if (message.author.id === '828745580125225031' || message.channel.id === '1010026917208002591') {
			console.log('Ignorando canal de avisos e/ou Helton acionando sistema');
			return;
		}

		if (!message.content.startsWith(prefix) &&
			message.content.toLowerCase().includes('aula') &&
      arrayHoje.some((v) => message.content.toLowerCase().includes(v))
		) {
			if (this.client.ignoreRoles.some((v) => message.member.roles.includes(v))) {
				console.log('\u001b[33m', 'Ignorando tentativa de staff acionar sistema em ' + message.channel.name + ' !');
				return;
			}
			const dbcheck = await this.client.db.global.findOne({ id: message.channel.guild.id });
			if (
				dbcheck && dbcheck.usersInCooldown.includes(message.author.id)
			) {
				console.log(
					'\u001b[33m', 'Ignorando tentativa de' + message.author.tag + 'acionar sistema em ' +
          message.channel.name +
        ' !'
				);
				return;
			}
			if (dbcheck && dbcheck.ignoredUsers.includes(message.author.id)) return;
    
			const hoje = new Date();
			const ano = hoje.getFullYear();
			const hora = new Date()
				.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
				.split(' ')[1]
				.split(':')[0];
			const mes = hoje.getMonth() + 1;
			const dia = (hoje.getDate() < 10 ? '0' : '') + hoje.getDate();
			let diaSemana = hoje.getDay();
			let saudacao = '';
			if (parseInt(hora) >= 6 && parseInt(hora) < 12) {
				saudacao = 'bom dia';
			} else if (parseInt(hora) >= 12 && parseInt(hora) < 18) {
				saudacao = 'boa tarde';
			} else if (parseInt(hora) >= 18 && parseInt(hora) < 24) {
				saudacao = 'boa noite';
			} else if (parseInt(hora) >= 0 && parseInt(hora) < 6) {
				saudacao = 'boa madrugada';
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
			];
			const stringFeriados = feriadosBrasil.join();
			const dataAtual = dia + '/' + mes + '/' + ano;
			const ehFeriado = stringFeriados.includes(dataAtual);
			let embedColor;
			let reactEmoji;
			let emojiInicio;

			if (message.content.toLowerCase().includes('segunda')) {
				diaSemana = 1;
			} else if (message.content.toLowerCase().includes('terça')) {
				diaSemana = 2;
			} else if (message.content.toLowerCase().includes('quarta')) {
				diaSemana = 3;
			} else if (message.content.toLowerCase().includes('quinta')) {
				diaSemana = 4;
			} else if (message.content.toLowerCase().includes('sexta')) {
				diaSemana = 5;
			} else if (
				message.content.toLowerCase().includes('sábado') ||
        message.content.toLowerCase().includes('sabado')
			) {
				diaSemana = 6;
			} else if (message.content.toLowerCase().includes('domingo')) {
				diaSemana = 0;
			} else if (
				message.content.toLowerCase().includes('amanha') ||
        message.content.toLowerCase().includes('amanhã')
			) {
				diaSemana = diaSemana + 1;
			} else {
				diaSemana = hoje.getDay();
			}


			function verificarDiaUtil(client) {
				if (ehFeriado) {
					reactEmoji = '❌';
					embedColor = 15204352;
					emojiInicio = '<:pepetear:1145856597579542568>';

					let nomeFeriado;
					switch (dataAtual) {
					case '01/1/' + ano:
						nomeFeriado = 'Ano Novo';
						break;
					case '21/4/' + ano:
						nomeFeriado = 'Tiradentes';
						break;
					case '01/5/' + ano:
						nomeFeriado = 'Dia do Trabalho';
						break;
					case '07/9/' + ano:
						nomeFeriado = 'Independência do Brasil';
						break;
					case '12/10/' + ano:
						nomeFeriado = 'Nossa Senhora Aparecida';
						break;
					case '02/11/' + ano:
						nomeFeriado = 'Finados';
						break;
					case '15/11/' + ano:
						nomeFeriado = 'Proclamação da República';
						break;
					case '25/12/' + ano:
						nomeFeriado = 'Natal';
						break;
					}
					return `Durante os feriados não temos aula. As aulas ocorrem todos os dias, de segunda a sexta-feira, e eventualmente no sábado, **fique atento ao cronograma**.\nHoje é feriado de \`${nomeFeriado}\`, logo não haverá aula`;
				} else if (!dbcheck.classes.enabled) {
					const reason = dbcheck.classes.reason;
					reactEmoji = '❌';
					embedColor = 15204352;
					emojiInicio = '<:pepetear:1145856597579542568>';
					return `Foi definido pela equipe que não haverá aulas por motivo de \`${reason}\`. As aulas ocorrem todos os dias, de segunda a sexta-feira, e eventualmente no sábado, **fique atento ao cronograma**.`;
				} else if (diaSemana === 0) {
					reactEmoji = '❌';
					embedColor = 15204352;
					emojiInicio = '<:pepetear:1145856597579542568>';
					return 'Durante os finais de semana não temos aula. As aulas ocorrem todos os dias, de segunda a sexta-feira, e eventualmente no sábado, **fique atento ao cronograma**.';
				} else if (diaSemana === 6) {
					reactEmoji = 'steve_pensando:905024502038147142';
					embedColor = 16776960;
					emojiInicio = '<:steve_pensando:905024502038147142>';
					return 'As aulas ocorrem todos os dias, de segunda a sexta-feira, e **eventualmente no sábado, fique atento ao cronograma**.';
				} else {
					reactEmoji = '✅';
					embedColor = 3066993;
					emojiInicio = '<:sir_derp:1145737198868647936>';
					return 'As aulas ocorrem todos os dias, de segunda a sexta-feira, e eventualmente no sábado, **fique atento ao cronograma**.';
				}
			}

			const fun = verificarDiaUtil(this.client);
			message.createReaction(reactEmoji);
			console.log(dataAtual);

			const cronograma = await this.client.getCronograma();

			const msg = await message.channel.createMessage({
				content: message.member.mention,
				messageReference: { messageID: message.id },
				embeds: [
					{
						description: `${emojiInicio} Olá, ${saudacao}. ${fun}\n\n<:purplearrow:1145719018121089045> Verifique o [Cronograma](https://discord.com/channels/892472046729179136/939937615325560912) ou nosso [Instagram](https://www.instagram.com/universidadecraftsapiens/) para mais informações!\n<:purplearrow:1145719018121089045> [Saiba como entrar no servidor](https://craftsapiens.canasdev.tech/)\n\n${cronograma.url ? '**O cronograma de aulas mais recente foi anexado a esta mensagem**' : 'Não me foi possivel obter o cronograma de aulas mais recente, contacte um administrador'}`,
						color: embedColor,
						image: {
							url: `${cronograma?.url}`,
						},
						footer: {
							text: 'Assistente | Confirme a leitura para poder acionar o sistema de novo',
							iconURL:
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
								customID: 'confirm',
								disabled: false,
								emoji: {
									id: '1145724790271910031',
									name: 'pepereading'
								},
								type: 2
							},
							{
								style: 1,
								label: 'Silenciar',
								emoji: {
									id: '1224711851007283260',
									name: 'Peepo_Ping',
								},
								customID: 'silenciar',
								disabled: false,
								type: 2
							}

						]
					}
				]
			});
			dbcheck.helped++;
			if (message.author.id == '733963304610824252') dbcheck.save();
			if (message.author.id !== '733963304610824252') {
				dbcheck.usersInCooldown.push(message.author.id);
				dbcheck.save();
				setTimeout(() => {
					dbcheck.usersInCooldown = dbcheck.usersInCooldown.filter((v) => v !== message.author.id);
					dbcheck.save();
					if (message) message.delete();
					if (msg) msg.delete();
					console.log(
						'\u001b[33m', 'Devido a 5 minutos sem resposta ' + message.author.username + ' foi removido da lista de usuários que acionaram o sistema, e a mensagem foi deletada.'
					);
				}
				, 300000);
			}

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
			'hylex',
			'darkcraft'
		];

		if (!this.client.allowedUsers.includes(message.author.id) && blacklistedWords.some((v) => message.content.toLowerCase().includes(v))) {
			this.client.users.get('733963304610824252').createDM().then(a => a.createMessage({ content: `Mensagem de **@${message.author.username} (${message.author.id})** foi deletada por conter possiveis divulgações de outros servidores.\n\n\`\`\`${message.content}\`\`\`` }));
			return message.delete();
		}

		if(message.content.startsWith('<@!734297444744953907>') || message.content.startsWith('<@734297444744953907>')) {
			const msg = message.content.slice(prefix.length).split(/ +/);

			message.content = `${prefix}ask ${msg.slice(1).join(' ')}`;

		}

		if (!message.content.startsWith(prefix)) return;

		const args = message.content.slice(prefix.length).split(/ +/);
		const cmd = args.shift()?.toLowerCase();

		if (!cmd) return;

		const command = this.client.commands.find(
			(c) => c.name === cmd || c.aliases?.includes(cmd),
		);

		if (command) {
			const db = await this.client.db.global.findOne({ id: message.guild.id });

			if (command.category === 'Music') {
				if (db.music.blacklistedUsers.includes(message.author.id)) {
				const embed = new this.client.embed()
				.setDescription(':x: **Você foi proibido por um administrador de usar comandos de Música**\nMotivo: `Utilização indevida do sistema`')
				.setColor('16711680')
				.setFooter('Essa mensagem se autodestruirá em 15 segundos.');

				const msg = await message.channel.createMessage({
					embeds: [embed],
					messageReference: { messageID: message.id }
				});

				setTimeout(() => {
					if (msg) msg.delete();
				}, 15000);

				return;
			}
			if (!this.client.getDiscordByNick(message.member.nick)) {
				const embed = new this.client.embed()
				.setDescription('**Para usar o sistema de música da Craftsapiens, você precisa de ter a sua conta discord vinculada com o minecraft!**')
				.addField('Como vincular?', '> Para vincular sua conta use o comando `/discord link` no minecraft da Craftsapiens!')
				.setColor('16711680')
				.setFooter('Qualquer duvida, contacte um STAFF | Essa mensagem se autodestruirá em 1 minuto.');

				const msg = await message.channel.createMessage({
					embeds: [embed],
					messageReference: { messageID: message.id }
				});

				setTimeout(() => {
					if (msg) msg.delete();
				}, 60000);

				return;
			}
			}

			const ctx = new CommandContext(this.client, message, args);

			command.execute(ctx);
		}
	
}

}
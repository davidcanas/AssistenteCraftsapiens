import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import { DefaultQueue } from 'vulkava';
import { User } from 'oceanic.js';

export default class Queue extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'queue',
			description: 'Vê a lista de musicas que estão na fila',
			category: 'Music',
			aliases: ['lista', 'list'],
			options: [], //lol
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		const player = this.client.music.players.get(ctx.msg.guildID);
	
		if (!player) {
			ctx.sendMessage('Não estou a tocar nada');
			return;
		}

		const voiceChannelID  = ctx.msg.member.voiceState.channelID;
		if (!voiceChannelID) {
			ctx.sendMessage('Você não está em nenhum canal de voz');
			return;
		}

        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== player.voiceChannelId)) {
          ctx.sendMessage({ content: 'Você não está no mesmo canal de voz onde a música está tocando!', flags: 1 << 6 });
          return;
        }

		let test: Array<string> = [];
		const playerQueue = player.queue as DefaultQueue;
		playerQueue.tracks.forEach((q) => {
			const requester = q.requester as User;
			const autor = this.client.users.get(requester.id);
			test.push(
				'`' +
                q.title +
                '`' +
                '- ' +
                '_(' +
                autor.username +
                '#' +
                autor.discriminator +
                ')_'
			);
		});
		if (!test.length) {
			ctx.sendMessage('Não existe nenhuma musica na queue');
		}
		
		if (test.length > 50) test = test.slice(0, 50);

		const quebed = new this.client.embed()
			.setTitle('✨ Lista de musicas')
			.setDescription(test.join('\n'))
			.setColor('RANDOM')
			.setFooter(ctx.author.username)
			.setTimestamp();
		ctx.sendMessage({ embeds: [quebed] });
	}
}
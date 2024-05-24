import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import { ConnectionState } from 'vulkava';
import { User } from 'oceanic.js';

export default class NowPlaying extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'np',
			description: 'Veja a musica que está sendo tocada nesse momento',
			category: 'Music',
			aliases: ['nowplaying'],
			options: [
			], 
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		if (ctx.channel.type !== 0 || !ctx.guild) return;
		
		const currPlayer = this.client.music.players.get(ctx.guild.id as string);
		

		if (!currPlayer || currPlayer.state === ConnectionState.DISCONNECTED) {
			ctx.sendMessage('Não estou a tocar nada nesse momento.');
			return;
		}

        const voiceChannelID = ctx.member?.voiceState?.channelID;

        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== currPlayer.voiceChannelId)) {
          ctx.sendMessage({ content: 'Você não está no mesmo canal de voz onde a música está tocando!', flags: 1 << 6 });
          return;
        }

		
        const song = currPlayer.current; 
        const requester = song.requester as User;
        const progressBar = ctx.progressBar((currPlayer.position/1000), (song.duration/1000), 20);
        const embed = new this.client.embed()
            .setTitle('🎵 Tocando agora:')
            .setDescription(`\`\`\`\n${progressBar}\n[${ctx.MsToHour(currPlayer.position)}]            [${ctx.MsToHour(song.duration)}]\n\`\`\``)
            .addField('🎶 Título:', `\`${song.title}\``)
            .addField('⏲️ Duração:', `\`${ctx.MsToHour(song.duration)}\``)
            .addField('👤 Pedido por:', `<@${requester.id}>`)
            .setThumbnail(song.thumbnail)
            .setColor('RANDOM');
        
        ctx.sendMessage({ embeds: [embed]});
	}
}
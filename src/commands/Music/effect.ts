import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import { ConnectionState } from 'vulkava';

export default class Speedup extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'effect',
			description: ' Ativa/desativa um efeito na queue atual',
			category: 'Music',
			aliases: ['speedup'],
			options: [
				{
					type: 3,
					name: 'efeito',
					description: 'O efeito a ativar',
					required: true,
					choices: [
						{
							name: 'Speedup',
							value: 'speedup',
						},
					],
				},
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

		
		if (!currPlayer.speedup) {
			currPlayer.filters.setTimescale({pitch: 1.18, rate: 1.10, speed: 1.15});
			ctx.sendMessage('O efeito speedup foi ativado');
			currPlayer.speedup = true;
			return;
		} else {
			currPlayer.filters.clear();
			ctx.sendMessage('O efeito speedup foi desativado!');
			currPlayer.speedup = false;
			return;

		}
	}}

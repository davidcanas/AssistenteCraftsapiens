import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import { ConnectionState } from 'vulkava';

export default class Volume extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'effect',
			description: '[STAFF] Ativa/desativa um efeito na queue atual',
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
  
		if (!this.client.ignoreRoles.some((v) => ctx.msg.member.roles.includes(v))) {
			ctx.sendMessage({
				content: 'Você não tem acesso a esse comando!',
				flags: 1 << 6,
			});
			return;
		}
  
		if (!currPlayer || currPlayer.state === ConnectionState.DISCONNECTED) {
			ctx.sendMessage('Não estou a tocar nada nesse momento.');
			return; 
		}
    
		if (!currPlayer.speedup) {
			currPlayer.filters.setTimescale({pitch: 1.18, rate: 1.10, speed: 1.15});
			ctx.sendMessage('O efeito speedup foi ativado');
			currPlayer.speedup = true;
			return;
		} else if(currPlayer.speedup) {
			currPlayer.filters.clear();
			ctx.sendMessage('O efeito speedup foi desativado!');
			currPlayer.speedup = false;
			return;

		}

		ctx.sendMessage({content: 'Ocorreu um problema'});
	}}
import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';

export default class PlayerList extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'playerlist',
			description: 'Obtenha o nick e outras informações de todos os jogadores online (Com o mapa ativo)',
			category: 'Info',
			aliases: ['tab', 'pllist', 'pl'],
			options: [],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {

		ctx.defer();

		const players = await this.client.utils.dynmap.getDynmapPlayers();

		const embed = new this.client.embed()
			.setTitle('Lista de jogadores online')
			.setDescription(players.join('\n'))
			.setFooter(`Total: ${players.length}`)
			.setColor('RANDOM');

		ctx.sendMessage({
			embeds: [embed],
		});

	}
}

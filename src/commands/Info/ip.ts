import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';

export default class IPCommand extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'ip',
			description: 'Obtenha o IP e informaçõoes do servidor',
			category: 'Info',
			aliases: ['ipserver', 'serverip', 'ipserver'],
			options: [],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		const fetch = await this.client.fetch('https://api.mcstatus.io/v2/status/java/jogar.craftsapiens.com.br').then(a => a.json());
		const embed = new this.client.embed()
			.setTitle('<:craftsapiens:905025137869463552> Craftsapiens')
			.setDescription('O servidor suporta todas as plataformas (Java, Bedrock)\nCaso você seja um jogador de Bedrock, use a porta `19132` para se conectar!')
			.addField('🌐 IP', '`jogar.craftsapiens.com.br`', false)
			.addField('🟢 Status', fetch.online ? 'Online' : 'Offline', false)
			.setThumbnail('https://cdn.discordapp.com/avatars/734297444744953907/81cad590e4210c0842963d23327d855d.png?size=2048');
		if (fetch.online) {
			embed.addField('👥 Jogadores na rede', `${fetch.players.online}/${fetch.players.max}`, false);
		}
		embed.setColor(fetch.online ? '5763719' : '15548997');

		ctx.sendMessage({
			embeds: [embed]
		});
	}
}
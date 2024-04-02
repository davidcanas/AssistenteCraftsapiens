import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import { AutocompleteInteraction } from 'oceanic.js';

export default class cityinfo extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'cityinfo',
			description: 'Obtenha informações de uma cidade do survival da craftsapiens',
			category: 'Info',
			aliases: ['cinfo'],
			autocomplete: true,
			options: [
				{
					type: 3,
					name: 'cidade',
					description: 'Nome da cidade',
					focused: true,
					autocomplete: true,
				}
			]
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
        
		try {
			ctx.defer();
			if (!ctx.args[0]) {
				ctx.sendMessage('Você precisa especificar um jogador!');
				return;
			}
			const req = await this.client.fetch('http://jogar.craftsapiens.com.br:10004/up/world/Earth/').then(a => a.json());
			const cityinfo = this.client.utils.dynmap.findCityInfo(req, ctx.args[0]);
			const mayorinfo = await this.client.getPlayerInfo(cityinfo?.mayor);
			const embed = new this.client.embed()
				.setTitle(`<:craftsapiens:905025137869463552> Informações da cidade ${cityinfo?.city}`)
				.addField('👑 Prefeito', cityinfo?.mayor, true)
				.addField('🗺️ Nação', `${cityinfo?.nation || 'N/A'}`, true)
				.addField('👤 Habitantes (' + cityinfo?.members.length + ')', `\`${cityinfo?.members.join(', ') || 'N/A'}\``, false)
				.setFooter('Assistente | Craftsapiens')
				.setColor('RANDOM')
				.setThumbnail(`https://mineskin.eu/armor/bust/${cityinfo?.mayor}/100.png`);
			if (mayorinfo.isStaff) {
				embed.setDescription(`✨ O prefeito da cidade é \`${mayorinfo?.staff}\` da Craftsapiens!`);
			}
			ctx.sendMessage({ embeds: [embed] });
		} catch (err) {
			ctx.sendMessage({ content: `Ocorreu um erro ao executar este comando!\n**Erro:** \`${err}\``, flags: 1 << 6 });
			console.log(err);
		}
	}

	async runAutoComplete(interaction: AutocompleteInteraction, value: string) {
		if (!value) {
			interaction.result([]);
			return;
		}

		const allCities = await this.client.utils.dynmap.getAllRegisteredCities(
			await this.client.fetch('http://jogar.craftsapiens.com.br:10004/up/world/Earth/').then(a => a.json())
		);


		const similarCities = allCities.filter(player =>
			this.client.utils.levDistance(player, value) <= 1
		);


		const chunkedCities = this.chunkArray(similarCities, 25);

		const arr = [];
		for (const chunk of chunkedCities) {

			arr.push(...chunk.map(player => ({
				name: player,
				value: player,
			})));
		}

		interaction.result(arr);
	}

	chunkArray(array, size) {
		const chunkedArray = [];

		if (!array) {
			return chunkedArray;
		}

		for (let i = 0; i < array.length; i += size) {
			const chunk = array.slice(i, i + size);
			chunkedArray.push(chunk);
		}

		return chunkedArray;
	}
}

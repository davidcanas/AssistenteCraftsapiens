import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { AutocompleteInteraction } from "oceanic.js";

export default class cityinfo extends Command {
	constructor(client: Client) {
		super(client, {
			name: "cityinfo",
			description: "Obtenha informações de uma cidade do survival da craftsapiens",
			category: "Info",
			aliases: ["cinfo"],
			autocomplete: true,
			options: [
				{
					type: 3,
					name: "cidade",
					description: "Nome da cidade",
					focused: true,
					autocomplete: true,
				}
			]
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		try {
			await ctx.defer();

			const cityName = ctx.args[0];
			if (!cityName) {
				ctx.sendMessage("⚠️ Você precisa especificar uma cidade!");
				return;
			}

			const city = await this.client.api.getTownInfo(cityName);
			if (!city) {
				ctx.sendMessage("⚠️ Cidade não encontrada!");
				return;
			}

			const foundedDate = new Date(city.foundedAt).toLocaleDateString("pt-BR");
			const residents = city.residents?.map(r => r.name) || [];
			const habitantes_n = residents.length >= 36 ? "mais de 36" : residents.length.toString();

			let residentList = "N/A";
			if (residents.length > 0) {
				if (residents.length > 20) {
					const shown = residents.slice(0, 20).join(", ");
					const more = residents.length - 20;
					residentList = `${shown} … e mais ${more}`;
				} else {
					residentList = residents.join(", ");
				}
			}

			const embed = new this.client.embed()
				.setTitle(`<:craftsapiens:905025137869463552> Informações da cidade ${city.name}`)
				.addField("👑 Prefeito", city.mayor || "N/A", true)
				.addField("🗺️ Nação", !city.nation || city.nation?.name === "null" ? "N/A" : city.nation.name, true)
				.addField(`👥 Habitantes (${habitantes_n})`, residentList)
				.addField("📅 Fundada em", foundedDate, true)
				.addField("💰 Tesouro", `${city.balance.toLocaleString("pt-BR")} coins`, true)
				.addField("📦 Terras", `${city.townBlocks} chunks`, true)
				.addField("📍 Localização", `X: ${city.location.x} | Z: ${city.location.z}`, true)
				.setFooter("Assistente | Craftsapiens")
				.setColor(parseInt(city.mapColor, 16))
				.setThumbnail(`https://mineskin.eu/armor/bust/${city.mayor}/100.png`);

			ctx.sendMessage({ embeds: [embed] });
		} catch (err) {
			ctx.sendMessage({ content: `❌ Ocorreu um erro ao executar este comando!\n**Erro:** \`${err}\``, flags: 1 << 6 });
			console.error(err);
		}
	}

	async runAutoComplete(interaction: AutocompleteInteraction, value: string) {
		try {
			const allCities = await this.client.api.getTownList();

			const similarCities = allCities.filter(city =>
				this.client.utils.levDistance(city.name.toLowerCase(), value.toLowerCase()) <= 2 ||
				city.name.toLowerCase().includes(value.toLowerCase())
			);

			const arr = similarCities.slice(0, 25).map(city => ({
				name: city.name,
				value: city.name,
			}));

			interaction.result(arr);
		} catch (err) {
			console.error("Erro no autocomplete:", err);
			interaction.result([]);
		}
	}
}

import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { AutocompleteInteraction } from "oceanic.js";

export default class playerinfo extends Command {
	constructor(client: Client) {
		super(client, {
			name: "playerinfo",
			description: "Obtenha informações de um jogador do survival da craftsapiens",
			category: "Info",
			aliases: ["plinfo"],
			options: [
				{
					type: 3,
					name: "player",
					description: "Nome do jogador"
				}
			]
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		ctx.defer();
		try {
	
			let playerinfo;

			if (!ctx.args[0] && ctx.member.nick) {
				playerinfo = await this.client.getPlayerInfo(ctx.member.nick);

			} else  {
				playerinfo = await this.client.getPlayerInfo(ctx.args[0]);
			}

			const discordUser = this.client.guilds.get("892472046729179136").members.get(playerinfo?.discord);
			const embed = new this.client.embed()
				.setTitle(`<:craftsapiens:905025137869463552> Informações de ${playerinfo?.nick}`)
				.addField("<:discord:1185986429147431074> Discord", `${discordUser ? discordUser.mention : "`Não vinculado`"}`, true)
				.addField("🏙️ Cidade", `${playerinfo?.city?.name || "N/A"}`, true);
			if (playerinfo?.isStaff) {
				embed.setDescription(`✨ **${playerinfo?.nick}** é \`${playerinfo?.staff}\` da Craftsapiens!`);
			}

			if (playerinfo.online) {
				embed.addField("<:coracao:1116737198709030972> Saúde", `${playerinfo?.health}/20`, true);
				embed.addField("🗺️ Coordenadas", `X: ${playerinfo?.coords?.x}, Y: ${playerinfo?.coords?.y}, Z: ${playerinfo?.coords?.z}`, true);
			}
			if (playerinfo?.original) {
				embed.addField("🆔 UUID", `\`${playerinfo?.uuid}\``, false);
			}

			embed.setFooter(`${playerinfo?.online ? "O jogador está online no Geopolítico!" : "O jogador não está online, ou tem o /mapa desativado!"}`);
			embed.setColor("RANDOM");
			if (playerinfo.nick.toLowerCase() === "heltonnn") {
				embed.setThumbnail("https://mineskin.eu/armor/bust/743a3d61e4644b89a3ec77fa4d43ae8d/100.png");
			} else {
				embed.setThumbnail(`https://mineskin.eu/armor/bust/${playerinfo.uuid}/100.png`);
			}

			ctx.sendMessage({ embeds: [embed] });
		} catch (err) {
			ctx.sendMessage({ content: `Ocorreu um erro ao executar este comando!\n**Erro:** \`${err}\``, flags: 1 << 6 });
			console.log(err);
		}
	}
}

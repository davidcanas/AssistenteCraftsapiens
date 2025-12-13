import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class playerinfo extends Command {
	constructor(client: Client) {
		super(client, {
			name: "playerinfo",
			description: "Obtenha informações de um jogador do survival da Craftsapiens",
			category: "Info",
			aliases: ["pinfo"],
			options: [
				{
					type: 3,
					name: "jogador",
					description: "Nome do jogador",
					required: false,
				}
			]
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		try {
			await ctx.defer();

			const playerName = ctx.args[0] || ctx.member?.nick;

			const playerInfo = await this.client.api.getPlayerInfo(playerName);
			if (!playerInfo?.data) {
				ctx.sendMessage(`Jogador \`${playerName}\` não encontrado no banco de dados.`);
				return;
			}

			const data = playerInfo.data;

			// Remover § códigos de cor do nickname
			const cleanNickname = (data.nickname || data.username).replace(/§[0-9A-FK-ORa-fk-or]/g, "");

			// Grupo + cores
			const groupColors: Record<string, string> = {
				reitor: "#008B8B",
				dev: "#00BFFF",
				admin: "#8B0000",
				professor: "#00FF7F",
				moderador: "#FF4500",
				ajuda: "#9370DB",
				premium: "#228B22",
				vip: "#FFD700",
				default: "#AAAAAA"
			};

			const group = (data.group || "default").toLowerCase();

			// Nome formatado no título da embed
			const formattedName =
				group === "default"
					? cleanNickname
					: `[${group.charAt(0).toUpperCase() + group.slice(1)}] ${cleanNickname}`;

			// Embed
			const embed = new this.client.embed()
				.setTitle(`👤 ${formattedName}`)
				.setThumbnail(`https://mineskin.eu/armor/bust/${data.username}/100.png`)
				.addField("📝 Username", data.username || "N/A", true)
				.addField("🌍 Cidade", data.towny?.townName || "N/A", true)
				.addField("🏳️ Nação", data.towny?.nationName || "N/A", true)
				.addField("⚔️ Kills", `${data.status?.kills ?? 0}`, true)
				.addField("💀 Mortes", `${data.status?.deaths ?? 0}`, true)
				.addField("💰 Dinheiro", `${data.status?.money?.toLocaleString("pt-PT")} sapiens`, true)
				.setColor(groupColors[group] || "RANDOM")
				.setFooter("Assistente | Craftsapiens");

			if (data.status?.online) {
				embed.setDescription("🟢 O jogador está **online** agora!");
				embed.addField("❤️ Vida", `${data.status?.health ?? 0}`, true);
				embed.addField("🍗 Fome", `${data.status?.hunger ?? 0}`, true);
			} else {
				embed.setDescription("🔴 O jogador está **offline**.");
			}

            if (data.towny?.friends && data.towny.friends.length > 0) {
				const friendsList = data.towny.friends
					.slice(0, 20)
					.map(f => `• ${f}`)
					.join("\n");

				embed.addField("👥 Amigos", friendsList, false);
			}


			ctx.sendMessage({ embeds: [embed] });
		} catch (err) {
			ctx.sendMessage({
				content: `❌ Ocorreu um erro ao executar este comando!\n**Erro:** \`${err}\``,
				flags: 1 << 6
			});
			console.error(err);
		}
	}
}

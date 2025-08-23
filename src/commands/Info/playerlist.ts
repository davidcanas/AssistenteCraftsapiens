import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { createCanvas, loadImage } from "canvas";

export default class PlayerList extends Command {
	constructor(client: Client) {
		super(client, {
			name: "playerlist",
			description: "Obtenha o nick e outras informações de todos os jogadores online (Com o mapa ativo)",
			category: "Info",
			aliases: ["tab", "pllist", "pl"],
			options: [],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		await ctx.defer();

		// agora a api retorna { data: { players: [...] } }
		const response = await this.client.api.getPlayerList();
		const players = response.data.players.filter((p: any) => p.status.online); // só os online

		const padding = 20, lineHeight = 40, baseHeight = 140, width = 800;
		const height = baseHeight + players.length * lineHeight + padding;

		const canvas = createCanvas(width, height);
		const ctx2d = canvas.getContext("2d");

		// fundo
		ctx2d.fillStyle = "#23272A";
		ctx2d.fillRect(0, 0, width, height);

		// título
		ctx2d.fillStyle = "white";
		ctx2d.font = "bold 40px Sans";
		const title = "Lista de jogadores online";
		ctx2d.fillText(title, (width - ctx2d.measureText(title).width) / 2, padding + 40);

		// cores de grupos
		const groupColors: Record<string, string> = {
			admin: "red",
			ajuda: "#FFD700",
			reitor: "#00CED1",
			dev: "#00FFFF",
			professor: "#32CD32",
			vip: "#FFA500",
			premium: "#9370DB"
		};

		ctx2d.font = "32px Sans";
		players.forEach((player: any, i: number) => {
			const text = `${player.nickname || player.username} [${player.group}]`;
			const color = groupColors[player.group.toLowerCase()] || "white";
			const xOffset = (width - ctx2d.measureText(text).width) / 2;

			// nick
			ctx2d.fillStyle = "white";
			ctx2d.fillText(player.nickname || player.username, xOffset, baseHeight + i * lineHeight);

			// grupo
			const nickWidth = ctx2d.measureText(player.nickname || player.username).width;
			ctx2d.fillStyle = color;
			ctx2d.fillText(` [${player.group}]`, xOffset + nickWidth, baseHeight + i * lineHeight);
		});

		// logo
		const logo = await loadImage("https://i.imgur.com/S6tkD7r.jpeg");
		ctx2d.drawImage(logo, 10, 10, 80, 80);

		// total
		ctx2d.fillStyle = "#888";
		ctx2d.font = "20px Sans";
		const totalText = `Total: ${players.length} jogadores online (Com o /mapa ativo)`;
		ctx2d.fillText(totalText, (width - ctx2d.measureText(totalText).width) / 2, height - padding);

		const buffer = canvas.toBuffer();

		const component = {
			type: 1,
			components: [
				{
					type: 2,
					style: 2,
					customID: "confirm_read",
					label: "",
					emoji: {
						id: "1300170561607172096",
						name: "lixo"
					}
				}
			]
		};

		await ctx.sendMessage({
			content: `👀 ${ctx.author.mention}`,
			files: [{ contents: buffer, name: "playerlist.png" }],
			components: [component]
		});
	}
}

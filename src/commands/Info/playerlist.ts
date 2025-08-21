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

		const players = await this.client.api.getPlayerList();
		const padding = 20, lineHeight = 40, baseHeight = 140, width = 800;
		const height = baseHeight + players.length * lineHeight + padding;

		const canvas = createCanvas(width, height);
		const ctx2d = canvas.getContext("2d");


		ctx2d.fillStyle = "#23272A";
		ctx2d.fillRect(0, 0, width, height);


		ctx2d.fillStyle = "white";
		ctx2d.font = "bold 40px Sans";
		const title = "Lista de jogadores online";
		ctx2d.fillText(title, (width - ctx2d.measureText(title).width) / 2, padding + 40);


		const tags = {
			"[Admin]": "red",
			"[Ajuda]": "#FFD700",
			"[Reitor]": "#00CED1",
			"[Dev]": "#00FFFF"
		};


		ctx2d.font = "32px Sans";
		players.forEach((player, i) => {
            console.log(player);
			let xOffset = (width - ctx2d.measureText(player).width) / 2;
			for (const [tag, color] of Object.entries(tags)) {
				if (player.includes(tag)) {
					const [beforeTag, afterTag] = player.split(tag);
					ctx2d.fillStyle = "white";
					ctx2d.fillText(beforeTag, xOffset, baseHeight + i * lineHeight);
					xOffset += ctx2d.measureText(beforeTag).width;
					ctx2d.fillStyle = color;
					ctx2d.fillText(tag, xOffset, baseHeight + i * lineHeight);
					xOffset += ctx2d.measureText(tag).width;
					ctx2d.fillStyle = "white";
					ctx2d.fillText(afterTag, xOffset, baseHeight + i * lineHeight);
					return;
				}
			}
			ctx2d.fillStyle = "white";
			ctx2d.fillText(player, xOffset, baseHeight + i * lineHeight);
		});


		const logo = await loadImage("https://i.imgur.com/S6tkD7r.jpeg");
		ctx2d.drawImage(logo, 10, 10, 80, 80);


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

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

		const response = await this.client.api.getPlayerList();
		const players = response.data.players.filter((p: any) => p.status.online);

		// hierarquia
		const hierarchy = [
			"reitor",
			"dev",
			"admin",
			"professor",
			"moderador",
			"ajuda",
			"premium",
			"vip",
			"default"
		];

		// cores dos grupos
		const groupColors: Record<string, string> = {
			premium: "#00AA00",   
			vip: "#FFFF55",       
			professor: "#55FF55", 
			admin: "#AA0000",    
			dev: "#55FFFF",       
			reitor: "#00AAAA",    
			ajuda: "#FFAA00",     
			moderador: "#FF5555",
			default: "white"
		};

		// ordenação pela hierarquia
		players.sort((a: any, b: any) => {
			const rankA = hierarchy.indexOf(a.group?.toLowerCase() || "default");
			const rankB = hierarchy.indexOf(b.group?.toLowerCase() || "default");
			return rankA - rankB;
		});

		const padding = 20, lineHeight = 40, baseHeight = 140, width = 800;
		const height = baseHeight + players.length * lineHeight + padding;

		const canvas = createCanvas(width, height);
		const ctx2d = canvas.getContext("2d");

		// fundo
		ctx2d.fillStyle = "#23272A";
		ctx2d.fillRect(0, 0, width, height);

		ctx2d.fillStyle = "white";
		ctx2d.font = "bold 40px Sans";
		const title = "Lista de jogadores online";
		ctx2d.fillText(title, (width - ctx2d.measureText(title).width) / 2, padding + 40);

		const mcColors: Record<string, string> = {
			"§0": "#000000", "§1": "#0000AA", "§2": "#00AA00", "§3": "#00AAAA",
			"§4": "#AA0000", "§5": "#AA00AA", "§6": "#FFAA00", "§7": "#AAAAAA",
			"§8": "#555555", "§9": "#5555FF", "§a": "#55FF55", "§b": "#55FFFF",
			"§c": "#FF5555", "§d": "#FF55FF", "§e": "#FFFF55", "§f": "#FFFFFF",
			"§r": "#FFFFFF"
		};

		function drawColoredText(text: string, x: number, y: number) {
			let currentColor = "#FFFFFF";
			let i = 0;
			while (i < text.length) {
				if (text[i] === "§" && i + 1 < text.length) {
					const code = text.substring(i, i + 2);
					if (mcColors[code]) {
						currentColor = mcColors[code];
						i += 2;
						continue;
					}
				}
				const char = text[i];
				ctx2d.fillStyle = currentColor;
				ctx2d.fillText(char, x, y);
				x += ctx2d.measureText(char).width;
				i++;
			}
			return x;
		}

		ctx2d.font = "32px Sans";
		players.forEach((player: any, i: number) => {
			const group = player.group?.toLowerCase() || "default";
			const groupColor = groupColors[group] || "white";

			const groupFormatted = group !== "default"
				? group.charAt(0).toUpperCase() + group.slice(1)
				: null;

			const tag = groupFormatted ? `[${groupFormatted}] ` : "";
			const nick = player.nickname || player.username;

			const totalWidth =
				ctx2d.measureText(tag).width +
				nick.replace(/§./g, "").split("").reduce((acc, ch) => acc + ctx2d.measureText(ch).width, 0);

			let xOffset = (width - totalWidth) / 2;
			const y = baseHeight + i * lineHeight;

			if (tag) {
				ctx2d.fillStyle = groupColor;
				ctx2d.fillText(tag, xOffset, y);
				xOffset += ctx2d.measureText(tag).width;
			}

			drawColoredText(nick, xOffset, y);
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

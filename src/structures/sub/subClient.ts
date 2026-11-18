import { Client, ClientOptions } from "oceanic.js";
import { LavalinkNodeOptions } from "lavalink-client";

import Music from "./subMusic";

export default class subClient extends Client {

	music: Music;

	constructor(token: string) {
		const clientOptions: ClientOptions = {
			auth: token,
			defaultImageFormat: "png",
			gateway: {
				// Só entram em canal de voz e respondem slash command: não precisam de intents privilegiadas.
				intents: ["GUILDS", "GUILD_VOICE_STATES"],
			},
			collectionLimits: {
				messages: 100,
			},
		};

		super(clientOptions);


	}

	connect(): Promise<void> {
		return super.connect();
	}

	connectLavaLink(): void {
		const nodes: LavalinkNodeOptions[] = [
			{
				id: `${this.user.username}'s Lavalink`,
				host: process.env.LAVALINKURL as string,
				port: Number(process.env.LAVALINKPORT) || 50011,
				authorization: process.env.LAVALINKPASSWORD as string,
				retryAmount: Infinity,
				retryDelay: 10000,
				secure: false,
			}
		];

		this.music = new Music(this, nodes);

		this.music.init();
		super.on("packet", (packet) => this.music.sendRawData(packet as any));
	}

	registerSlashCommands(): void {
		const cmds = [
			{
				name: this.user.username.toLowerCase(),
				description: this.user.username + " | Mostra a música que está tocando no momento",
				type: 1,
				options: []
			}
		];

		this.application.bulkEditGuildCommands("892472046729179136", cmds);
	}
	MsToHour(time) {
		time = Math.round(time / 1000);
		const s = time % 60,
			m = ~~((time / 60) % 60),
			h = ~~(time / 60 / 60);

		return h === 0
			? `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
			: `${String(Math.abs(h) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
	}
	progressBar(current, total, barSize) {
		const progress = Math.round((barSize * current) / total);

		return "━".repeat(progress > 0 ? progress - 1 : progress) + "🔘" + "━".repeat(barSize - progress);
	}
}
